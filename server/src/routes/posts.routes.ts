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
const platformEnum = z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "WEBSITE"]);

// Per-platform media override. Each selected platform may carry its own photo/
// video; rows with no override fall back to the post-level mediaUrl at publish.
const platformMediaSchema = z.object({
  platform: platformEnum,
  mediaUrl: z.string().url().optional().nullable(),
  mediaType: z.enum(["image", "video"]).optional().nullable(),
});

const createPostSchema = z.object({
  title: z.string().min(1).max(300),
  masterCaption: z.string().max(5000).default(""),
  status: z.enum(["DRAFT", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
  scheduledAt: z.string().datetime().optional().nullable(),
  mediaUrl: z.string().url().optional().nullable(),
  mediaType: z.enum(["image", "video"]).optional().nullable(),
  platforms: z.array(platformEnum).min(1),
  accountIds: z.array(z.string()).default([]),
  platformMedia: z.array(platformMediaSchema).optional(),
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

    // Pair each selected platform with an account of the SAME platform.
    // Never trust positional alignment between `platforms` and `accountIds`:
    // if a platform is selected without a matching connected account, a
    // positional map would attach the wrong account (e.g. an Instagram row
    // pointing at the Facebook account), causing a duplicate Facebook post.
    const selectedAccounts = body.accountIds.length
      ? await prisma.socialAccount.findMany({ where: { id: { in: body.accountIds } } })
      : [];
    const selectedPlatforms = new Set<string>(body.platforms);

    // Map each selected platform to its optional per-platform media override.
    const mediaByPlatform = new Map<string, { mediaUrl: string | null; mediaType: string | null }>();
    for (const m of body.platformMedia ?? []) {
      mediaByPlatform.set(m.platform, { mediaUrl: m.mediaUrl ?? null, mediaType: m.mediaType ?? null });
    }

    const platformRows = selectedAccounts
      .filter((a) => selectedPlatforms.has(a.platform))
      .map((a) => ({
        platform: a.platform,
        accountId: a.id,
        mediaUrl: mediaByPlatform.get(a.platform)?.mediaUrl ?? null,
        mediaType: mediaByPlatform.get(a.platform)?.mediaType ?? null,
      }));

    // Post-level media stays as a fallback (list thumbnails, older clients,
    // publisher default). When the client only sends per-platform media, seed
    // it from the first platform that has one.
    const firstPlatformMedia = platformRows.find((r) => r.mediaUrl);
    const postMediaUrl = body.mediaUrl ?? firstPlatformMedia?.mediaUrl ?? null;
    const postMediaType = body.mediaType ?? firstPlatformMedia?.mediaType ?? null;

    const post = await prisma.scheduledPost.create({
      data: {
        title: body.title,
        masterCaption: body.masterCaption,
        status: body.status as never,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        mediaUrl: postMediaUrl,
        mediaType: postMediaType,
        platforms: { create: platformRows },
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

    // Post-level media fallback: if the client only sends per-platform media,
    // seed the post-level thumbnail from the first platform that has one.
    const fallbackPm = body.platformMedia?.find((m) => m.mediaUrl) ?? null;

    const post = await prisma.$transaction(async (tx) => {
      await tx.scheduledPost.update({
        where: { id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.masterCaption !== undefined ? { masterCaption: body.masterCaption } : {}),
          ...(body.status !== undefined ? { status: body.status as never } : {}),
          ...(body.scheduledAt !== undefined
            ? { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null }
            : {}),
          ...(body.mediaUrl !== undefined
            ? { mediaUrl: body.mediaUrl }
            : fallbackPm
              ? { mediaUrl: fallbackPm.mediaUrl ?? null }
              : {}),
          ...(body.mediaType !== undefined
            ? { mediaType: body.mediaType }
            : fallbackPm
              ? { mediaType: fallbackPm.mediaType ?? null }
              : {}),
        },
      });

      // Apply per-platform media overrides to existing platform rows. Never
      // touch rows already PUBLISHED/PUBLISHING — their media is locked in.
      for (const m of body.platformMedia ?? []) {
        await tx.scheduledPostPlatform.updateMany({
          where: { scheduledPostId: id, platform: m.platform, status: { notIn: ["PUBLISHED", "PUBLISHING"] } },
          data: { mediaUrl: m.mediaUrl ?? null, mediaType: m.mediaType ?? null },
        });
      }

      return tx.scheduledPost.findUnique({ where: { id }, include: { platforms: true } });
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
