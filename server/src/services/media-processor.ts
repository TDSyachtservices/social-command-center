import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execFileAsync = promisify(execFile);

export interface PlatformSpec {
  platform: string;
  placement: string;
  width: number;
  height: number;
  aspectRatio: string;
  format: string;
  mimeType: string;
}

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

/**
 * Resize and crop an image to each platform spec using ImageMagick v7.
 * Each output uses cover-crop: resize to fill the target dimensions, then
 * centre-crop to the exact width×height.
 */
export async function processImage(
  inputPath: string,
  outputDir: string,
  specs: PlatformSpec[] = IMAGE_PLATFORM_SPECS,
): Promise<ProcessedVersion[]> {
  fs.mkdirSync(outputDir, { recursive: true });

  const results: ProcessedVersion[] = [];

  for (const spec of specs) {
    const outputFileName = `${spec.platform.toLowerCase()}_${spec.placement}.jpg`;
    const outputPath = path.join(outputDir, outputFileName);

    // convert <input> -resize W×H^ -gravity center -extent W×H -quality 85 -strip <output>
    // Uses ImageMagick v6 "convert" (installed via apk on Alpine). The ^ modifier
    // ensures the image is resized to *at least* the target dimensions before
    // the -extent crops it exactly.
    await execFileAsync("convert", [
      inputPath,
      "-resize", `${spec.width}x${spec.height}^`,
      "-gravity", "center",
      "-extent", `${spec.width}x${spec.height}`,
      "-quality", "85",
      "-strip",      // remove EXIF / ICC metadata to reduce file size
      outputPath,
    ]);

    const { size } = fs.statSync(outputPath);
    results.push({ spec, outputPath, fileSizeBytes: size });
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
