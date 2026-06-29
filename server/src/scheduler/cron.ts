import { prisma } from "../db/prisma.js";
import { publishPostById } from "../services/publisher.js";
import { logger } from "../utils/logger.js";

const POLL_INTERVAL_MS = 60_000;
const MAX_PER_TICK = 20;

let handle: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (handle) return;
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Scheduler started");
  void tick();
  handle = setInterval(() => void tick(), POLL_INTERVAL_MS);
}

export function stopScheduler(): void {
  if (!handle) return;
  clearInterval(handle);
  handle = null;
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
