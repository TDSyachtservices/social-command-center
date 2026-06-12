import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { validateBody } from "../utils/validation.js";
import { notFound } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { requireInternalApiKey } from "../utils/auth.js";

const router = Router();

// ─── POST /api/scheduler/publish-now ─────────────────────────────────────────
const publishNowSchema = z.object({
  postId: z.string().min(1),
});

router.post(
  "/publish-now",
  validateBody(publishNowSchema),
  async (req: Request, res: Response) => {
    const { postId } = req.body as z.infer<typeof publishNowSchema>;

    const post = await prisma.scheduledPost.findUnique({
      where: { id: postId },
      include: { platforms: { include: { account: true } } },
    });
    if (!post) throw notFound("Post", postId);

    if (!["DRAFT", "SCHEDULED", "FAILED"].includes(post.status)) {
      sendError(
        res,
        "BAD_REQUEST",
        `Post status '${post.status}' cannot be published`,
      );
      return;
    }

    await prisma.scheduledPost.update({
      where: { id: postId },
      data: { status: "PUBLISHING" },
    });

    await prisma.publishLog.create({
      data: {
        scheduledPostId: post.id,
        postTitle: post.title,
        platform: post.platforms[0]?.platform ?? "FACEBOOK",
        action: "publish_started",
        status: "pending",
      },
    });

    logger.info({ postId }, "Publish-now triggered (mock)");

    // Mock: mark as published after acknowledging
    setImmediate(async () => {
      try {
        await prisma.scheduledPost.update({
          where: { id: postId },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
        await prisma.publishLog.create({
          data: {
            scheduledPostId: post.id,
            postTitle: post.title,
            platform: post.platforms[0]?.platform ?? "FACEBOOK",
            action: "publish_success",
            status: "success",
            apiResponse: JSON.stringify({ mock: true }),
          },
        });
      } catch (err) {
        logger.error(err, "Mock publish update failed");
      }
    });

    sendSuccess(res, { queued: true, postId });
  },
);

// ─── POST /api/scheduler/schedule ─────────────────────────────────────────────
const scheduleSchema = z.object({
  postId: z.string().min(1),
  scheduledAt: z.string().datetime(),
});

router.post(
  "/schedule",
  validateBody(scheduleSchema),
  async (req: Request, res: Response) => {
    const { postId, scheduledAt } = req.body as z.infer<typeof scheduleSchema>;

    const post = await prisma.scheduledPost.findUnique({ where: { id: postId } });
    if (!post) throw notFound("Post", postId);

    if (new Date(scheduledAt) <= new Date()) {
      sendError(res, "BAD_REQUEST", "scheduledAt must be in the future");
      return;
    }

    const updated = await prisma.scheduledPost.update({
      where: { id: postId },
      data: { status: "SCHEDULED", scheduledAt: new Date(scheduledAt) },
    });

    await prisma.publishLog.create({
      data: {
        scheduledPostId: post.id,
        postTitle: post.title,
        platform: "FACEBOOK",
        action: "post_scheduled",
        status: "success",
      },
    });

    sendSuccess(res, updated);
  },
);

// ─── POST /api/scheduler/cancel ──────────────────────────────────────────────
const cancelSchema = z.object({ postId: z.string().min(1) });

router.post(
  "/cancel",
  validateBody(cancelSchema),
  async (req: Request, res: Response) => {
    const { postId } = req.body as z.infer<typeof cancelSchema>;

    const post = await prisma.scheduledPost.findUnique({ where: { id: postId } });
    if (!post) throw notFound("Post", postId);
    if (post.status !== "SCHEDULED") {
      sendError(res, "BAD_REQUEST", "Only scheduled posts can be cancelled");
      return;
    }

    const updated = await prisma.scheduledPost.update({
      where: { id: postId },
      data: { status: "DRAFT", scheduledAt: null },
    });
    sendSuccess(res, updated);
  },
);

// ─── GET /api/scheduler/queue ─────────────────────────────────────────────────
router.get("/queue", async (_req: Request, res: Response) => {
  const posts = await prisma.scheduledPost.findMany({
    where: { status: "SCHEDULED" },
    include: { platforms: true },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });
  sendSuccess(res, posts);
});

// ─── POST /api/scheduler/webhooks/n8n ─────────────────────────────────────────
// Protected by the shared internal API key (x-internal-api-key header).
router.post("/webhooks/n8n", requireInternalApiKey, async (req: Request, res: Response) => {
  const { action, postId } = req.body as { action?: string; postId?: string };
  logger.info({ action, postId }, "N8N webhook received");
  sendSuccess(res, { received: true, action, postId });
});

export default router;
