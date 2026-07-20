import type { Platform } from "@/data/mockPosts";

/**
 * Hard publish-blocking media rules, derived from Meta's Graph API content
 * publishing limits for Facebook Pages and Instagram (feed) posts. These are
 * intentionally stricter than the "Platform Compatibility" advisory panel —
 * a file that fails one of these checks is rejected outright and can never
 * be attached to the post, instead of just showing a "will be cropped" note.
 *
 * LinkedIn is not a live publishing integration yet, so it only gets a
 * lightweight format/size sanity check rather than Meta-specific limits.
 */
export interface MediaRule {
  allowedMimeTypes: string[];
  maxFileSizeBytes: number;
  minWidth: number;
  maxWidth?: number;
  /** width / height */
  aspectRatioMin: number;
  aspectRatioMax: number;
  minDurationSec?: number;
  maxDurationSec?: number;
}

export const IMAGE_RULES: Record<Platform, MediaRule> = {
  Facebook: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/bmp", "image/tiff", "image/webp"],
    maxFileSizeBytes: 10 * 1024 * 1024,
    minWidth: 200,
    aspectRatioMin: 0.5,
    aspectRatioMax: 2.0,
  },
  Instagram: {
    allowedMimeTypes: ["image/jpeg", "image/png"],
    maxFileSizeBytes: 8 * 1024 * 1024,
    minWidth: 320,
    maxWidth: 1440,
    aspectRatioMin: 0.8,
    aspectRatioMax: 1.91,
  },
  LinkedIn: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/bmp"],
    maxFileSizeBytes: 10 * 1024 * 1024,
    minWidth: 200,
    aspectRatioMin: 0.5,
    aspectRatioMax: 2.0,
  },
};

export const VIDEO_RULES: Record<Platform, MediaRule> = {
  Facebook: {
    allowedMimeTypes: ["video/mp4", "video/quicktime"],
    maxFileSizeBytes: 1 * 1024 * 1024 * 1024,
    minWidth: 120,
    aspectRatioMin: 0.4,
    aspectRatioMax: 2.5,
    minDurationSec: 1,
    maxDurationSec: 240 * 60,
  },
  Instagram: {
    allowedMimeTypes: ["video/mp4", "video/quicktime"],
    maxFileSizeBytes: 1 * 1024 * 1024 * 1024,
    minWidth: 320,
    aspectRatioMin: 0.56,
    aspectRatioMax: 1.91,
    minDurationSec: 3,
    maxDurationSec: 90,
  },
  LinkedIn: {
    allowedMimeTypes: ["video/mp4"],
    maxFileSizeBytes: 200 * 1024 * 1024,
    minWidth: 256,
    aspectRatioMin: 0.4,
    aspectRatioMax: 2.5,
    minDurationSec: 3,
    maxDurationSec: 600,
  },
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

export interface MediaValidationResult {
  valid: boolean;
  reasons: string[];
}

export function validateMediaFile(opts: {
  platform: Platform;
  mediaType: "image" | "video";
  file: File;
  width: number;
  height: number;
  durationSec?: number;
}): MediaValidationResult {
  const { platform, mediaType, file, width, height, durationSec } = opts;
  const rule = (mediaType === "video" ? VIDEO_RULES : IMAGE_RULES)[platform];
  const reasons: string[] = [];

  if (!rule) return { valid: true, reasons: [] };

  if (rule.allowedMimeTypes.length > 0 && file.type && !rule.allowedMimeTypes.includes(file.type)) {
    reasons.push(
      `${platform} only accepts ${rule.allowedMimeTypes.map((t) => t.split("/")[1].toUpperCase()).join("/")} ${mediaType === "video" ? "videos" : "images"} — "${file.type || "unknown"}" isn't supported.`,
    );
  }

  if (file.size > rule.maxFileSizeBytes) {
    reasons.push(
      `File is ${formatBytes(file.size)}, which is over ${platform}'s ${formatBytes(rule.maxFileSizeBytes)} limit for ${mediaType}s.`,
    );
  }

  if (width > 0 && height > 0) {
    if (width < rule.minWidth) {
      reasons.push(`${platform} requires a minimum width of ${rule.minWidth}px — this file is only ${width}px wide.`);
    }
    if (rule.maxWidth && width > rule.maxWidth) {
      reasons.push(`${platform} allows a maximum width of ${rule.maxWidth}px — this file is ${width}px wide.`);
    }

    const ratio = width / height;
    if (ratio < rule.aspectRatioMin || ratio > rule.aspectRatioMax) {
      reasons.push(
        `${platform}'s aspect ratio must be between ${rule.aspectRatioMin.toFixed(2)}:1 and ${rule.aspectRatioMax.toFixed(2)}:1 — this file is ${ratio.toFixed(2)}:1.`,
      );
    }
  }

  if (mediaType === "video" && durationSec != null && durationSec > 0) {
    if (rule.minDurationSec != null && durationSec < rule.minDurationSec) {
      reasons.push(`${platform} videos must be at least ${rule.minDurationSec}s long — this one is ${durationSec.toFixed(1)}s.`);
    }
    if (rule.maxDurationSec != null && durationSec > rule.maxDurationSec) {
      const maxLabel = rule.maxDurationSec >= 60 ? `${Math.round(rule.maxDurationSec / 60)}min` : `${rule.maxDurationSec}s`;
      reasons.push(`${platform} videos can't exceed ${maxLabel} — this one is ${Math.round(durationSec)}s.`);
    }
  }

  return { valid: reasons.length === 0, reasons };
}
