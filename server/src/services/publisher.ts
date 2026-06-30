import { prisma } from "../db/prisma.js";
import { decrypt } from "../utils/crypto.js";
import { publishPost as fbPublishPost, type PublishResult as AdapterPublishResult } from "../adapters/facebook.js";
import { publishPost as igPublishPost } from "../adapters/instagram.js";
import { logger } from "../utils/logger.js";
import type { Platform } from "@prisma/client";

export interface PublishResult {
  succeeded: number;
  failed: number;
  skipped: number;
}

/**
 * Determines the caption sent to a platform adapter.
 * A per-platform override takes precedence; falls back to the post-level master caption.
 */
export function resolveCaption(platformCaption: string | null | undefined, masterCaption: string): string {
  return platformCaption ?? masterCaption;
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

    // A platform row can exist without an account (caption-only draft created
    // before the user connects an account).  Skip it — we cannot publish without
    // a real access token.
    if (!account) {
      logger.info({ platformId: platform.id, platform: platform.platform }, "No account linked — skipping platform row");
      await prisma.scheduledPostPlatform.update({
        where: { id: platform.id },
        data: { status: "SKIPPED", errorMessage: "No connected account. Link an account and retry." },
      });
      skipped++;
      continue;
    }

    // Defensive guard: never publish a platform row through an adapter for a
    // different platform. If the row's target platform and the account's
    // platform disagree, skip instead of cross-posting (e.g. an Instagram row
    // accidentally attached to a Facebook account).
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
      const caption = resolveCaption(platform.platformCaption, post.masterCaption);

      // Dispatch to the platform-specific adapter. Facebook can post text-only
      // or with media; Instagram requires media and uses a 2-step container flow.
      const result: AdapterPublishResult =
        account.platform === "INSTAGRAM"
          ? await igPublishPost({
              accessToken,
              igUserId: account.accountId,
              caption,
              mediaUrl: effectiveMediaUrl,
              mediaType: effectiveMediaType,
            })
          : await fbPublishPost({
              accessToken,
              pageId: account.accountId,
              message: caption,
              mediaUrl: effectiveMediaUrl,
              mediaType: effectiveMediaType,
            });

      if (result.success) {
        await prisma.scheduledPostPlatform.update({
          where: { id: platform.id },
          // Lock in the media actually sent, so a later edit of the post-level
          // fallback can't retroactively change a published row's media.
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
