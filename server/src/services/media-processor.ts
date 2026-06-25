import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execFileAsync = promisify(execFile);

// ImageMagick 7 exposes the unified `magick` binary; ImageMagick 6 (and some
// distro packages, including certain Alpine builds) only ship the legacy
// `convert` command. We don't know which is present in a given environment
// (local vs. Alpine on Railway), so resolve the binary once on first use by
// probing both, then cache the winner.
let resolvedMagickCmd: string | null = null;

async function resolveMagickCmd(): Promise<string> {
  if (resolvedMagickCmd) return resolvedMagickCmd;
  const errors: string[] = [];
  for (const cmd of ["magick", "convert"]) {
    try {
      await execFileAsync(cmd, ["-version"]);
      resolvedMagickCmd = cmd;
      return cmd;
    } catch (err) {
      errors.push(`${cmd}: ${(err as Error).message}`);
    }
  }
  throw new Error(
    `ImageMagick not found on PATH (tried magick, convert) — ${errors.join("; ")}`,
  );
}

/**
 * Run ImageMagick with the given args, automatically using whichever binary
 * (`magick` or `convert`) exists in this environment. On failure the captured
 * ImageMagick stderr is folded into the thrown error message so the real cause
 * surfaces in logs and API responses instead of a bare non-zero exit code.
 */
async function runImageMagick(args: string[]): Promise<void> {
  const cmd = await resolveMagickCmd();
  try {
    await execFileAsync(cmd, args);
  } catch (err) {
    const e = err as { stderr?: string; message?: string };
    const detail = (e.stderr ?? e.message ?? "").toString().trim();
    throw new Error(`ImageMagick (${cmd}) failed: ${detail || "unknown error"}`);
  }
}

export interface PlatformSpec {
  platform: string;
  placement: string;
  width: number;
  height: number;
  aspectRatio: string;
  format: string;
  mimeType: string;
}

export interface FocalPoint {
  x: number; // 0..1 fraction of source width
  y: number; // 0..1 fraction of source height
}

export const CENTER_FOCAL: FocalPoint = { x: 0.5, y: 0.5 };

export const IMAGE_PLATFORM_SPECS: PlatformSpec[] = [
  { platform: "FACEBOOK",  placement: "feed_landscape", width: 1200, height: 630,  aspectRatio: "1.91:1", format: "jpeg", mimeType: "image/jpeg" },
  { platform: "FACEBOOK",  placement: "feed_square",    width: 1080, height: 1080, aspectRatio: "1:1",    format: "jpeg", mimeType: "image/jpeg" },
  { platform: "INSTAGRAM", placement: "feed_square",    width: 1080, height: 1080, aspectRatio: "1:1",    format: "jpeg", mimeType: "image/jpeg" },
  { platform: "INSTAGRAM", placement: "story",          width: 1080, height: 1920, aspectRatio: "9:16",   format: "jpeg", mimeType: "image/jpeg" },
  { platform: "LINKEDIN",  placement: "feed_landscape", width: 1200, height: 627,  aspectRatio: "1.91:1", format: "jpeg", mimeType: "image/jpeg" },
  { platform: "TIKTOK",    placement: "feed_vertical",  width: 1080, height: 1920, aspectRatio: "9:16",   format: "jpeg", mimeType: "image/jpeg" },
  { platform: "WEBSITE",   placement: "og_image",       width: 1200, height: 628,  aspectRatio: "1.91:1", format: "jpeg", mimeType: "image/jpeg" },
];

export interface ProcessedVersion {
  spec: PlatformSpec;
  outputPath: string;
  fileSizeBytes: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * Crop + resize a source image to a single platform spec around a focal point,
 * using ImageMagick. The image is first resized to *cover* the target box, then
 * cropped to the exact width×height with the crop window centred on the focal
 * point (clamped so it never leaves the resized image).
 *
 * - `focal` is {x,y} as 0..1 fractions of the source. {0.5,0.5} == centre crop,
 *   which reproduces the original cover-crop behaviour.
 * - When the source dimensions are unknown (0), we fall back to ImageMagick's
 *   own `-resize ^ -gravity center -extent` cover-crop.
 *
 * Output is written atomically: ImageMagick renders to a temp file which is then
 * renamed over the destination, so an in-place re-crop never exposes a
 * half-written file to readers serving the same URL.
 *
 * Returns the output file size in bytes.
 */
export async function cropToSpec(
  inputPath: string,
  outputPath: string,
  spec: PlatformSpec,
  focal: FocalPoint = CENTER_FOCAL,
  srcWidth = 0,
  srcHeight = 0,
): Promise<number> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const W = spec.width;
  const H = spec.height;
  const tmpPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;

  let args: string[];
  if (srcWidth > 0 && srcHeight > 0) {
    // Resize to cover the target, then crop WxH at a focal-point offset.
    // ceil() guarantees both resized dimensions are >= the target box.
    const scale = Math.max(W / srcWidth, H / srcHeight);
    const resizedW = Math.max(W, Math.ceil(srcWidth * scale));
    const resizedH = Math.max(H, Math.ceil(srcHeight * scale));
    const offX = clamp(Math.round(focal.x * resizedW - W / 2), 0, resizedW - W);
    const offY = clamp(Math.round(focal.y * resizedH - H / 2), 0, resizedH - H);
    args = [
      inputPath,
      "-resize", `${resizedW}x${resizedH}!`,
      "-crop", `${W}x${H}+${offX}+${offY}`,
      "+repage",
      "-quality", "85",
      "-strip",
      `jpg:${tmpPath}`, // force JPEG output regardless of the temp extension
    ];
  } else {
    // Unknown source size: let ImageMagick cover-crop from the centre.
    args = [
      inputPath,
      "-resize", `${W}x${H}^`,
      "-gravity", "center",
      "-extent", `${W}x${H}`,
      "-quality", "85",
      "-strip",
      `jpg:${tmpPath}`,
    ];
  }

  try {
    await runImageMagick(args);
    const { size } = fs.statSync(tmpPath);
    fs.renameSync(tmpPath, outputPath);
    return size;
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      /* best effort cleanup */
    }
    throw err;
  }
}

/**
 * Resize and crop an image to each platform spec. Each output uses cover-crop
 * centred on the focal point (defaults to centre when none is supplied).
 * Pass the source dimensions so the focal-point offset can be computed; when
 * they are 0 the crop falls back to ImageMagick's centre cover-crop.
 */
export async function processImage(
  inputPath: string,
  outputDir: string,
  specs: PlatformSpec[] = IMAGE_PLATFORM_SPECS,
  srcWidth = 0,
  srcHeight = 0,
  focal: FocalPoint = CENTER_FOCAL,
): Promise<ProcessedVersion[]> {
  fs.mkdirSync(outputDir, { recursive: true });

  const results: ProcessedVersion[] = [];

  for (const spec of specs) {
    const outputFileName = `${spec.platform.toLowerCase()}_${spec.placement}.jpg`;
    const outputPath = path.join(outputDir, outputFileName);
    const fileSizeBytes = await cropToSpec(inputPath, outputPath, spec, focal, srcWidth, srcHeight);
    results.push({ spec, outputPath, fileSizeBytes });
  }

  return results;
}

/**
 * Quality score heuristic based on whether the source image is large enough
 * to avoid upscaling for a given spec.
 */
export function scoreQuality(
  srcWidth: number,
  srcHeight: number,
  spec: PlatformSpec,
): { score: number; label: string } {
  const srcPx = srcWidth * srcHeight;
  const specPx = spec.width * spec.height;
  const ratio = srcPx / specPx;

  if (ratio >= 1.5) return { score: 0.95, label: "Excellent" };
  if (ratio >= 1.0) return { score: 0.85, label: "Good" };
  if (ratio >= 0.5) return { score: 0.60, label: "Needs Review" };
  return { score: 0.30, label: "Poor" };
}
