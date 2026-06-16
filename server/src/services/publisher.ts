import { prisma } from "../db/prisma.js";
import { decrypt } from "../utils/crypto.js";
import { publishPost as fbPublishPost } from "../adapters/facebook.js";
import { logger } from "../utils/logger.js";

export interface PublishResult {
  succeeded: number;
  failed: number;
  skipped: number;
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

    if (account.platform !== "FACEBOOK") {
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
      await writePublishLog(postId, post.title, "FACEBOOK", "publish_failed", "error", null,
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
      const result = await fbPublishPost({
        accessToken,
        pageId: account.accountId,
        message: platform.platformCaption ?? post.masterCaption,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
      });

      if (result.success) {
        await prisma.scheduledPostPlatform.update({
          where: { id: platform.id },
          data: { status: "PUBLISHED", externalPostId: result.externalPostId, publishedAt: new Date() },
        });
        await writePublishLog(postId, post.title, "FACEBOOK", "published", "success",
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
        await writePublishLog(postId, post.title, "FACEBOOK", "publish_failed", "error",
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
      await writePublishLog(postId, post.title, "FACEBOOK", "publish_error", "error", null, errorMessage);
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
  platform: "FACEBOOK",
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
