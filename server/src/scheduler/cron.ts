import { prisma } from "../db/prisma.js";
import { publishPostById } from "../services/publisher.js";
import { logger } from "../utils/logger.js";
import { decrypt } from "../utils/crypto.js";
import { getPageInsights } from "../adapters/facebook.js";

const POLL_INTERVAL_MS = 60_000;
const FOLLOWER_POLL_INTERVAL_MS = 60 * 60_000; // 1 hour
const MAX_PER_TICK = 20;

let handle: ReturnType<typeof setInterval> | null = null;
let followerHandle: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (handle) return;
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Scheduler started");
  void tick();
  handle = setInterval(() => void tick(), POLL_INTERVAL_MS);

  // Start the hourly follower poll — first poll after 1 hour to avoid
  // hitting API rate limits on every server restart.
  followerHandle = setInterval(() => void followerPollTick(), FOLLOWER_POLL_INTERVAL_MS);
  logger.info({ intervalMs: FOLLOWER_POLL_INTERVAL_MS }, "Follower poller started");
}

export function stopScheduler(): void {
  if (handle) {
    clearInterval(handle);
    handle = null;
  }
  if (followerHandle) {
    clearInterval(followerHandle);
    followerHandle = null;
  }
  logger.info("Scheduler stopped");
}

async function tick(): Promise<void> {
  try {
    const now = new Date();
    const duePosts = await prisma.scheduledPost.findMany({
      where: { status: "SCHEDULED", scheduledAt: { lte: now } },
      select: { id: true, title: true, scheduledAt: true },
      take: MAX_PER_TICK,
      orderBy: { scheduledAt: "asc" },
    });

    if (duePosts.length === 0) return;

    logger.info({ count: duePosts.length }, "Scheduler tick: found due posts");

    for (const post of duePosts) {
      try {
        const updated = await prisma.scheduledPost.updateMany({
          where: { id: post.id, status: "SCHEDULED" },
          data: { status: "PUBLISHING" },
        });

        if (updated.count === 0) continue;

        logger.info({ postId: post.id, title: post.title }, "Publishing scheduled post");
        const result = await publishPostById(post.id);
        logger.info({ postId: post.id, ...result }, "Scheduled publish complete");
      } catch (err) {
        logger.error({ postId: post.id, err }, "Scheduled publish failed");
        await prisma.scheduledPost
          .update({ where: { id: post.id }, data: { status: "FAILED" } })
          .catch(() => {});
      }
    }
  } catch (err) {
    logger.error(err, "Scheduler tick error");
  }
}

// ─── Hourly follower poll ─────────────────────────────────────────────────────
async function followerPollTick(): Promise<void> {
  try {
    const accounts = await prisma.socialAccount.findMany({
      where: {
        connectionStatus: "connected",
        platform: { in: ["FACEBOOK", "INSTAGRAM"] },
        tokenEncrypted: { not: null },
      },
    });

    if (accounts.length === 0) return;

    logger.info({ count: accounts.length }, "Follower poll tick: checking accounts");

    for (const account of accounts) {
      let accessToken: string;
      try {
        accessToken = decrypt(account.tokenEncrypted!);
      } catch {
        logger.warn({ accountId: account.id }, "Follower poll: token decryption failed");
        continue;
      }

      try {
        let followersCount = 0;

        if (account.platform === "FACEBOOK") {
          const insights = await getPageInsights({ accessToken, pageId: account.accountId });
          followersCount = insights.followers;
        } else {
          // Instagram — fetch basic profile follower count via Graph API
          const url = new URL(`https://graph.facebook.com/v19.0/${account.accountId}`);
          url.searchParams.set("fields", "followers_count");
          url.searchParams.set("access_token", accessToken);
          const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
          const data = (await res.json()) as { followers_count?: number; error?: { message: string } };
          if (data.error) {
            logger.warn({ accountId: account.id, error: data.error }, "Instagram followers_count error");
            continue;
          }
          followersCount = data.followers_count ?? 0;
        }

        await prisma.platformStats.create({
          data: {
            platform: account.platform,
            accountId: account.id,
            followersCount,
          },
        });

        logger.info(
          { accountId: account.id, platform: account.platform, followersCount },
          "Follower count polled",
        );
      } catch (err) {
        logger.error({ accountId: account.id, err }, "Follower poll failed for account");
      }
    }
  } catch (err) {
    logger.error(err, "Follower poll tick error");
  }
}
