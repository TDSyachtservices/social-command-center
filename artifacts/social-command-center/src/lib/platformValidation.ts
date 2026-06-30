import type { Platform } from "@/data/mockPosts";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  platform: Platform;
  severity: ValidationSeverity;
  message: string;
}

interface PlatformContentRule {
  /** Platform cannot publish a text-only post — an image or video is mandatory. */
  requiresMedia?: boolean;
  /** Maximum caption length (characters) the platform accepts. */
  captionMax?: number;
}

export const PLATFORM_CONTENT_RULES: Record<Platform, PlatformContentRule> = {
  Facebook: { captionMax: 63206 },
  Instagram: { requiresMedia: true, captionMax: 2200 },
  LinkedIn: { captionMax: 3000 },
};

interface ValidatePostInput {
  platforms: Platform[];
  masterCaption: string;
  platformCaptions: Record<string, string>;
  platformHashtags: Record<string, string[]>;
  platformMedia: Record<string, { url: string } | null>;
}

/**
 * Check the composed post against each selected platform's content requirements
 * and return any issues. `error` issues will cause the publish to fail and should
 * block publishing; `warning` issues are advisory and let the user proceed.
 *
 * The media check mirrors the server's publish-time fallback: the first selected
 * platform that carries its own media becomes the post-level media that platforms
 * without their own media inherit. So a platform only fails the media requirement
 * when neither it nor any other selected platform has media.
 */
export function validatePostContent(input: ValidatePostInput): ValidationIssue[] {
  const { platforms, masterCaption, platformCaptions, platformHashtags, platformMedia } = input;
  const issues: ValidationIssue[] = [];

  const fallbackMediaUrl = platforms.map((p) => platformMedia[p]?.url).find(Boolean) ?? null;

  for (const platform of platforms) {
    const rule = PLATFORM_CONTENT_RULES[platform];
    if (!rule) continue;

    const effectiveMediaUrl = platformMedia[platform]?.url ?? fallbackMediaUrl;
    if (rule.requiresMedia && !effectiveMediaUrl) {
      issues.push({
        platform,
        severity: "error",
        message: `${platform} can't publish text-only posts — add an image or video.`,
      });
    }

    if (rule.captionMax != null) {
      const override = platformCaptions[platform];
      const caption = override && override.trim().length > 0 ? override : masterCaption;
      const tags = platformHashtags[platform] ?? [];
      const length = caption.length + (tags.length > 0 ? 1 + tags.join(" ").length : 0);
      if (length > rule.captionMax) {
        issues.push({
          platform,
          severity: "warning",
          message: `${platform} caption is ${length.toLocaleString()} characters — over the ${rule.captionMax.toLocaleString()} limit. It may be rejected or truncated.`,
        });
      }
    }
  }

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
