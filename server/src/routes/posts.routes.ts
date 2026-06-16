import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { validateBody, validateQuery } from "../utils/validation.js";
import { notFound } from "../utils/errors.js";
import { publishPostById } from "../services/publisher.js";
import { logger } from "../utils/logger.js";

const router = Router();

// ─── Query params ─────────────────────────────────────────────────────────────
const listQuerySchema = z.object({
  status: z.string().optional(),
  platform: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// ─── Body schemas ─────────────────────────────────────────────────────────────
const createPostSchema = z.object({
  title: z.string().min(1).max(300),
  masterCaption: z.string().max(5000).default(""),
  status: z.enum(["DRAFT", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
  scheduledAt: z.string().datetime().optional().nullable(),
  mediaUrl: z.string().url().optional().nullable(),
  mediaType: z.enum(["image", "video"]).optional().nullable(),
  platforms: z
    .array(z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "WEBSITE"]))
    .min(1),
  accountIds: z.array(z.string()).min(1),
});

const updatePostSchema = createPostSchema.partial();

// ─── GET /api/posts ────────────────────────────────────────────────────────────
router.get(
  "/",
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof listQuerySchema> })
      .validatedQuery;

    const where = {
      ...(q.status ? { status: q.status as never } : {}),
      ...(q.q
        ? { title: { contains: q.q, mode: "insensitive" as const } }
        : {}),
    };

    const [total, posts] = await Promise.all([
      prisma.scheduledPost.count({ where }),
      prisma.scheduledPost.findMany({
        where,
        include: {
          platforms: { select: { platform: true, accountId: true, status: true } },
        },
        orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);

    sendSuccess(res, posts, { total, page: q.page, limit: q.limit });
  },
);

// ─── GET /api/posts/:id ────────────────────────────────────────────────────────
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const post = await prisma.scheduledPost.findUnique({
    where: { id },
    include: {
      platforms: { include: { account: true } },
      publishLogs: { orderBy: { timestamp: "desc" }, take: 50 },
    },
  });
  if (!post) throw notFound("Post", id);
  sendSuccess(res, post);
});

// ─── POST /api/posts ───────────────────────────────────────────────────────────
router.post(
  "/",
  validateBody(createPostSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof createPostSchema>;

    const post = await prisma.scheduledPost.create({
      data: {
        title: body.title,
        masterCaption: body.masterCaption,
        status: body.status as never,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        mediaUrl: body.mediaUrl ?? null,
        mediaType: body.mediaType ?? null,
        platforms: {
          create: body.platforms.map((platform, i) => ({
            platform: platform as never,
            accountId: body.accountIds[i] ?? body.accountIds[0],
          })),
        },
      },
      include: { platforms: true },
    });

    sendSuccess(res, post, undefined, 201);
  },
);

// ─── PATCH /api/posts/:id ──────────────────────────────────────────────────────
router.patch(
  "/:id",
  validateBody(updatePostSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const body = req.body as z.infer<typeof updatePostSchema>;
    const existing = await prisma.scheduledPost.findUnique({ where: { id } });
    if (!existing) throw notFound("Post", id);

    const post = await prisma.scheduledPost.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.masterCaption !== undefined ? { masterCaption: body.masterCaption } : {}),
        ...(body.status !== undefined ? { status: body.status as never } : {}),
        ...(body.scheduledAt !== undefined
          ? { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null }
          : {}),
        ...(body.mediaUrl !== undefined ? { mediaUrl: body.mediaUrl } : {}),
        ...(body.mediaType !== undefined ? { mediaType: body.mediaType } : {}),
      },
      include: { platforms: true },
    });

    sendSuccess(res, post);
  },
);

// ─── DELETE /api/posts/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.scheduledPost.findUnique({ where: { id } });
  if (!existing) throw notFound("Post", id);
  await prisma.scheduledPost.delete({ where: { id } });
  sendSuccess(res, { deleted: true });
});

// ─── POST /api/posts/:id/schedule ────────────────────────────────────────────
const scheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
  platforms: z.array(z.string()).optional(),
  accountIds: z.array(z.string()).optional(),
});

router.post(
  "/:id/schedule",
  validateBody(scheduleSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const body = req.body as z.infer<typeof scheduleSchema>;
    const post = await prisma.scheduledPost.findUnique({ where: { id } });
    if (!post) throw notFound("Post", id);

    const updated = await prisma.scheduledPost.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledAt: new Date(body.scheduledAt),
      },
      include: { platforms: true },
    });
    sendSuccess(res, updated);
  },
);

// ─── POST /api/posts/:id/publish ──────────────────────────────────────────────
router.post("/:id/publish", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const post = await prisma.scheduledPost.findUnique({
    where: { id },
    include: { platforms: true },
  });
  if (!post) throw notFound("Post", id);

  if (!["DRAFT", "SCHEDULED", "FAILED"].includes(post.status)) {
    sendError(res, "BAD_REQUEST", `Cannot publish post with status '${post.status}'`);
    return;
  }

  await prisma.scheduledPost.update({ where: { id }, data: { status: "PUBLISHING" } });
  await prisma.publishLog.create({
    data: {
      scheduledPostId: id,
      postTitle: post.title,
      platform: post.platforms[0]?.platform ?? "FACEBOOK",
      action: "publish_triggered",
      status: "pending",
    },
  });

  sendSuccess(res, { postId: id, status: "publishing", note: "Publish in progress" });

  setImmediate(async () => {
    try {
      const result = await publishPostById(id);
      logger.info({ postId: id, ...result }, "Manual publish complete");
    } catch (err) {
      logger.error({ postId: id, err }, "Manual publish error");
      await prisma.scheduledPost
        .update({ where: { id }, data: { status: "FAILED" } })
        .catch(() => {});
    }
  });
});

// ─── POST /api/posts/:id/retry ────────────────────────────────────────────────
router.post("/:id/retry", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const post = await prisma.scheduledPost.findUnique({ where: { id } });
  if (!post) throw notFound("Post", id);
  if (post.status !== "FAILED") {
    sendError(res, "BAD_REQUEST", "Only failed posts can be retried");
    return;
  }

  const updated = await prisma.scheduledPost.update({
    where: { id },
    data: { status: "SCHEDULED" },
  });

  await prisma.publishLog.create({
    data: {
      scheduledPostId: post.id,
      postTitle: post.title,
      platform: "FACEBOOK",
      action: "retry_started",
      status: "pending",
    },
  });

  sendSuccess(res, updated);
});

export default router;
