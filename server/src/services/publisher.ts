import { prisma } from "../db/prisma.js";
import { decrypt } from "../utils/crypto.js";
import {
  publishPost as fbPublishPost,
  publishAlbum as fbPublishAlbum,
  publishStory as fbPublishStory,
  publishReel as fbPublishReel,
  publishEvent as fbPublishEvent,
  type PublishResult as AdapterPublishResult,
} from "../adapters/facebook.js";
import {
  publishPost as igPublishPost,
  publishCarousel as igPublishCarousel,
  publishStory as igPublishStory,
  publishReel as igPublishReel,
} from "../adapters/instagram.js";
import { logger } from "../utils/logger.js";
import type { Platform } from "@prisma/client";

export interface PublishResult {
  succeeded: number;
  failed: number;
  skipped: number;
}

export function resolveCaption(platformCaption: string | null | undefined, masterCaption: string): string {
  return platformCaption ?? masterCaption;
}

/** Type-safe helper to extract postMetadataJson fields. */
function getMeta(post: { postMetadataJson: unknown }): Record<string, unknown> {
  if (post.postMetadataJson && typeof post.postMetadataJson === "object" && !Array.isArray(post.postMetadataJson)) {
    return post.postMetadataJson as Record<string, unknown>;
  }
  return {};
}

export async function publishPostById(postId: string): Promise<PublishResult> {
  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId },
    include: { platforms: { include: { account: true } } },
  });

  if (!post) throw new Error(`Post not found: ${postId}`);

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const platform of post.platforms) {
    if (platform.status === "PUBLISHED") {
      skipped++;
      continue;
    }

    const account = platform.account;

    if (!account) {
      logger.info({ platformId: platform.id, platform: platform.platform }, "No account linked — skipping platform row");
      await prisma.scheduledPostPlatform.update({
        where: { id: platform.id },
        data: { status: "SKIPPED", errorMessage: "No connected account. Link an account and retry." },
      });
      skipped++;
      continue;
    }

    if (platform.platform !== account.platform) {
      logger.warn(
        { rowPlatform: platform.platform, accountPlatform: account.platform, platformId: platform.id },
        "Platform/account mismatch — skipping to avoid cross-posting",
      );
      await prisma.scheduledPostPlatform.update({
        where: { id: platform.id },
        data: { status: "SKIPPED", errorMessage: "Account platform does not match the target platform" },
      });
      skipped++;
      continue;
    }

    if (account.platform !== "FACEBOOK" && account.platform !== "INSTAGRAM") {
      logger.info({ platform: account.platform }, "Platform adapter not yet implemented — skipping");
      await prisma.scheduledPostPlatform.update({
        where: { id: platform.id },
        data: { status: "SKIPPED", errorMessage: "Platform adapter not yet implemented" },
      });
      skipped++;
      continue;
    }

    if (!account.tokenEncrypted || account.tokenEncrypted === "MOCK_TOKEN") {
      logger.warn({ accountId: account.id }, "No real access token — skipping platform");
      await prisma.scheduledPostPlatform.update({
        where: { id: platform.id },
        data: { status: "FAILED", errorMessage: "No real access token. Connect this account via OAuth first." },
      });
      await writePublishLog(postId, post.title, account.platform, "publish_failed", "error", null,
        "No real access token");
      failed++;
      continue;
    }

    let accessToken: string;
    try {
      accessToken = decrypt(account.tokenEncrypted);
    } catch (err) {
      logger.error({ accountId: account.id, err }, "Token decryption failed");
      await prisma.scheduledPostPlatform.update({
        where: { id: platform.id },
        data: { status: "FAILED", errorMessage: "Token decryption failed — reconnect account" },
      });
      failed++;
      continue;
    }

    try {
      const effectiveMediaUrl = platform.mediaUrl ?? post.mediaUrl;
      const effectiveMediaType = platform.mediaType ?? post.mediaType;
      const effectiveAdditionalUrls = platform.additionalMediaUrls.length > 0
        ? platform.additionalMediaUrls
        : post.additionalMediaUrls;
      const caption = resolveCaption(platform.platformCaption, post.masterCaption);
      const meta = getMeta(post);
      const postType = post.postType ?? "standard";

      let result: AdapterPublishResult;

      if (account.platform === "FACEBOOK") {
        result = await dispatchFacebook({
          postType,
          accessToken,
          pageId: account.accountId,
          message: caption,
          mediaUrl: effectiveMediaUrl,
          mediaType: effectiveMediaType,
          additionalMediaUrls: effectiveAdditionalUrls,
          meta,
        });
      } else {
        result = await dispatchInstagram({
          postType,
          accessToken,
          igUserId: account.accountId,
          caption,
          mediaUrl: effectiveMediaUrl,
          mediaType: effectiveMediaType,
          additionalMediaUrls: effectiveAdditionalUrls,
          meta,
        });
      }

      if (result.success) {
        await prisma.scheduledPostPlatform.update({
          where: { id: platform.id },
          data: {
            status: "PUBLISHED",
            externalPostId: result.externalPostId,
            publishedAt: new Date(),
            mediaUrl: effectiveMediaUrl,
            mediaType: effectiveMediaType,
          },
        });
        await writePublishLog(postId, post.title, account.platform, "published", "success",
          result.externalPostId ?? null, null, JSON.stringify(result.rawResponse));
        succeeded++;
      } else {
        await prisma.scheduledPostPlatform.update({
          where: { id: platform.id },
          data: {
            status: "FAILED",
            errorMessage: result.errorMessage ?? "Publish failed",
            retryCount: { increment: 1 },
          },
        });
        await writePublishLog(postId, post.title, account.platform, "publish_failed", "error",
          null, result.errorMessage ?? "Unknown", JSON.stringify(result.rawResponse));
        failed++;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error";
      logger.error({ postId, accountId: account.id, err }, "Publish threw an error");
      await prisma.scheduledPostPlatform.update({
        where: { id: platform.id },
        data: { status: "FAILED", errorMessage, retryCount: { increment: 1 } },
      });
      await writePublishLog(postId, post.title, account.platform, "publish_error", "error", null, errorMessage);
      failed++;
    }
  }

  const finalStatus = failed === 0 && skipped === 0
    ? "PUBLISHED"
    : succeeded > 0 ? "PUBLISHED" : "FAILED";

  await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      status: finalStatus,
      publishedAt: succeeded > 0 ? new Date() : undefined,
    },
  });

  return { succeeded, failed, skipped };
}

// ─── Platform dispatchers ──────────────────────────────────────────────────────

async function dispatchFacebook(opts: {
  postType: string;
  accessToken: string;
  pageId: string;
  message: string;
  mediaUrl: string | null | undefined;
  mediaType: string | null | undefined;
  additionalMediaUrls: string[];
  meta: Record<string, unknown>;
}): Promise<AdapterPublishResult> {
  const { postType, accessToken, pageId, message, mediaUrl, mediaType, additionalMediaUrls, meta } = opts;

  switch (postType) {
    case "album": {
      const allUrls = [
        ...(mediaUrl ? [mediaUrl] : []),
        ...additionalMediaUrls,
      ];
      return fbPublishAlbum({ accessToken, pageId, message, mediaUrls: allUrls });
    }

    case "story": {
      if (!mediaUrl) {
        return { success: false, errorMessage: "Facebook Story requires a photo or video." };
      }
      return fbPublishStory({
        accessToken,
        pageId,
        mediaUrl,
        mediaType: (mediaType === "video" ? "video" : "image") as "image" | "video",
      });
    }

    case "reel": {
      if (!mediaUrl) {
        return { success: false, errorMessage: "Facebook Reel requires a video." };
      }
      return fbPublishReel({ accessToken, pageId, videoUrl: mediaUrl, description: message });
    }

    case "event": {
      const eventName = String(meta.eventName ?? message.slice(0, 100));
      const startTime = String(meta.eventStartTime ?? "");
      if (!startTime) {
        return { success: false, errorMessage: "Facebook Event requires a start date/time." };
      }
      return fbPublishEvent({
        accessToken,
        pageId,
        name: eventName,
        description: message,
        startTime,
        endTime: meta.eventEndTime ? String(meta.eventEndTime) : null,
        location: meta.eventLocation ? String(meta.eventLocation) : null,
        coverImageUrl: mediaUrl ?? null,
      });
    }

    default:
      return fbPublishPost({ accessToken, pageId, message, mediaUrl, mediaType });
  }
}

async function dispatchInstagram(opts: {
  postType: string;
  accessToken: string;
  igUserId: string;
  caption: string;
  mediaUrl: string | null | undefined;
  mediaType: string | null | undefined;
  additionalMediaUrls: string[];
  meta: Record<string, unknown>;
}): Promise<AdapterPublishResult> {
  const { postType, accessToken, igUserId, caption, mediaUrl, mediaType, additionalMediaUrls, meta } = opts;

  switch (postType) {
    case "album": {
      // Instagram carousels support images (and videos) — map album → carousel
      const primaryItem = mediaUrl
        ? [{ url: mediaUrl, type: (mediaType === "video" ? "video" : "image") as "image" | "video" }]
        : [];
      const extraItems = additionalMediaUrls.map((u) => ({
        url: u,
        type: "image" as const,
      }));
      const items = [...primaryItem, ...extraItems];
      return igPublishCarousel({ accessToken, igUserId, caption, mediaItems: items });
    }

    case "story": {
      if (!mediaUrl) {
        return { success: false, errorMessage: "Instagram Story requires a photo or video." };
      }
      return igPublishStory({
        accessToken,
        igUserId,
        mediaUrl,
        mediaType: (mediaType === "video" ? "video" : "image") as "image" | "video",
      });
    }

    case "reel": {
      if (!mediaUrl) {
        return { success: false, errorMessage: "Instagram Reel requires a video." };
      }
      const musicCredit = meta.musicTrackName ? String(meta.musicTrackName) : null;
      return igPublishReel({ accessToken, igUserId, videoUrl: mediaUrl, caption, musicCredit });
    }

    case "event":
      return {
        success: false,
        errorMessage: "Instagram does not support Event posts. Skipping Instagram for this event.",
      };

    default:
      return igPublishPost({ accessToken, igUserId: igUserId, caption, mediaUrl, mediaType });
  }
}

async function writePublishLog(
  postId: string,
  postTitle: string,
  platform: Platform,
  action: string,
  status: string,
  externalPostId: string | null,
  errorMessage: string | null,
  apiResponse?: string,
): Promise<void> {
  await prisma.publishLog.create({
    data: {
      scheduledPostId: postId,
      postTitle,
      platform,
      action,
      status,
      externalPostId,
      errorMessage,
      apiResponse,
    },
  });
}
