import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { validateBody, validateQuery } from "../utils/validation.js";
import { notFound } from "../utils/errors.js";
import { decrypt } from "../utils/crypto.js";
import { getComments, getPagePosts, getPageFeedWithComments } from "../adapters/facebook.js";
import { logger } from "../utils/logger.js";

const router = Router();

// ─── List comments ────────────────────────────────────────────────────────────
const listQuerySchema = z.object({
  status: z.string().optional(),
  platform: z.string().optional(),
  priority: z.string().optional(),
  assignedUser: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

router.get(
  "/",
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof listQuerySchema> }).validatedQuery;

    const where = {
      ...(q.status ? { status: q.status as never } : {}),
      ...(q.platform ? { platform: q.platform as never } : {}),
      ...(q.priority ? { priority: q.priority as never } : {}),
      ...(q.assignedUser ? { assignedUser: q.assignedUser } : {}),
      ...(q.q
        ? {
            OR: [
              { commenterName: { contains: q.q, mode: "insensitive" as const } },
              { commentText: { contains: q.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, comments] = await Promise.all([
      prisma.socialComment.count({ where }),
      prisma.socialComment.findMany({
        where,
        include: {
          replies: { orderBy: { sentAt: "asc" } },
          notes: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { timestamp: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);

    sendSuccess(res, comments, { total, page: q.page, limit: q.limit });
  },
);

// ─── Sync logs ────────────────────────────────────────────────────────────────
// NOTE: declared BEFORE /:id routes to avoid parameter capture
router.get("/sync-logs", async (_req: Request, res: Response) => {
  const logs = await prisma.socialInboxSyncLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 100,
  });
  sendSuccess(res, logs);
});

// ─── Real Facebook comment sync ───────────────────────────────────────────────
router.post("/sync", async (_req: Request, res: Response) => {
  const accounts = await prisma.socialAccount.findMany({
    where: { connectionStatus: "connected", platform: "FACEBOOK", commentReadCapability: true },
  });

  let totalSynced = 0;
  let totalNew = 0;
  const results: Array<{ accountId: string; postId: string; synced: number; error?: string }> = [];

  for (const account of accounts) {
    if (!account.tokenEncrypted) continue;

    let accessToken: string;
    try {
      accessToken = decrypt(account.tokenEncrypted);
    } catch {
      logger.warn({ accountId: account.id }, "Token decryption failed during inbox sync");
      continue;
    }

    const appPostMap = await prisma.scheduledPostPlatform
      .findMany({
        where: { accountId: account.id, platform: "FACEBOOK", status: "PUBLISHED", externalPostId: { not: null } },
        include: { scheduledPost: { select: { title: true } } },
      })
      .then((rows) =>
        Object.fromEntries(rows.map((r) => [r.externalPostId!, r.scheduledPost.title])),
      );

    const feedPosts = await getPageFeedWithComments({ accessToken, pageId: account.accountId, limit: 50 });

    for (const post of feedPosts) {
      const postTitle = appPostMap[post.externalPostId] ?? (post.message.slice(0, 60) || "Facebook post");
      for (const c of post.comments) {
        const existing = await prisma.socialComment.findFirst({
          where: { externalCommentId: c.externalId },
        });
        if (!existing) {
          await prisma.socialComment.create({
            data: {
              platform: "FACEBOOK",
              accountId: account.id,
              accountName: account.accountName,
              commenterName: c.commenterName,
              commentText: c.text,
              originalPostTitle: postTitle,
              originalPostCaption: post.message,
              externalCommentId: c.externalId,
              timestamp: new Date(c.timestamp),
            },
          });
          totalNew++;
        } else if (
          c.commenterName !== "Unknown" &&
          c.commenterName !== "Facebook User" &&
          (existing.commenterName === "Unknown" || existing.commenterName === "Facebook User" || existing.commenterName === null)
        ) {
          await prisma.socialComment.update({
            where: { id: existing.id },
            data: { commenterName: c.commenterName },
          });
        }
        totalSynced++;
      }
      results.push({ accountId: account.id, postId: post.externalPostId, synced: post.comments.length });
    }

    await prisma.socialAccount.update({ where: { id: account.id }, data: { lastSync: new Date() } });
    await prisma.socialInboxSyncLog.create({
      data: { platform: "FACEBOOK", accountId: account.id, actionType: "comment_sync", status: "success" },
    });
  }

  sendSuccess(res, { accounts: accounts.length, totalSynced, totalNew, results });
});

// ─── Debug: inspect token + try feed endpoint ────────────────────────────────
router.get("/sync-debug", async (_req: Request, res: Response) => {
  const account = await prisma.socialAccount.findFirst({
    where: { connectionStatus: "connected", platform: "FACEBOOK" },
  });
  if (!account?.tokenEncrypted) {
    sendSuccess(res, { error: "No connected Facebook account" });
    return;
  }
  const accessToken = decrypt(account.tokenEncrypted);

  // Check what permissions the stored token actually has
  const permUrl = new URL(`https://graph.facebook.com/v19.0/me/permissions`);
  permUrl.searchParams.set("access_token", accessToken);
  const permRes = await fetch(permUrl.toString(), { signal: AbortSignal.timeout(10_000) });
  const permData = await permRes.json();

  // Try /posts with embedded comments — return raw data so we can see from field
  const postsUrl = new URL(`https://graph.facebook.com/v19.0/${account.accountId}/posts`);
  postsUrl.searchParams.set("access_token", accessToken);
  postsUrl.searchParams.set("fields", "id,message,created_time,comments{id,from{id,name},user_id,message,created_time}");
  postsUrl.searchParams.set("limit", "5");
  const postsRes = await fetch(postsUrl.toString(), { signal: AbortSignal.timeout(15_000) });
  const postsData = (await postsRes.json()) as {
    data?: Array<{ id: string; message?: string; comments?: { data: unknown[] } }>;
    error?: { message: string; code: number };
  };

  // Collect first 3 comment IDs from the nested query
  const nestedComments: unknown[] = [];
  const firstCommentIds: string[] = [];
  for (const p of postsData.data ?? []) {
    for (const c of (p.comments?.data ?? []) as Array<{ id: string }>) {
      nestedComments.push({ postId: p.id, comment: c });
      firstCommentIds.push(c.id);
      if (firstCommentIds.length >= 3) break;
    }
    if (firstCommentIds.length >= 3) break;
  }

  // Try fetching the first comment directly — direct object access sometimes
  // returns `from` even when the nested page-feed query does not
  const directResults: unknown[] = [];
  for (const commentId of firstCommentIds.slice(0, 2)) {
    const directUrl = new URL(`https://graph.facebook.com/v19.0/${commentId}`);
    directUrl.searchParams.set("access_token", accessToken);
    directUrl.searchParams.set("fields", "id,from{id,name},message");
    const directRes = await fetch(directUrl.toString(), { signal: AbortSignal.timeout(10_000) });
    directResults.push({ commentId, status: directRes.status, data: await directRes.json() });
  }

  sendSuccess(res, {
    nestedComments,
    directFetch: directResults,
    error: postsData.error ?? null,
  });
});

// ─── Trigger mock sync ────────────────────────────────────────────────────────
router.post("/sync-mock", async (_req: Request, res: Response) => {
  const accounts = await prisma.socialAccount.findMany({
    where: { connectionStatus: "connected" },
  });

  const logs = await Promise.all(
    accounts.map((acc) =>
      prisma.socialInboxSyncLog.create({
        data: {
          platform: acc.platform,
          accountId: acc.id,
          actionType: "comment_sync",
          status: "success",
        },
      }),
    ),
  );

  sendSuccess(res, { synced: logs.length, logs });
});

// ─── Get single comment ───────────────────────────────────────────────────────
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const comment = await prisma.socialComment.findUnique({
    where: { id },
    include: {
      replies: { orderBy: { sentAt: "asc" } },
      notes: { orderBy: { createdAt: "asc" } },
      account: true,
    },
  });
  if (!comment) throw notFound("Comment", id);
  sendSuccess(res, comment);
});

// ─── Update comment status/priority/assignment ────────────────────────────────
const updateCommentSchema = z.object({
  status: z
    .enum(["NEW", "REPLIED", "NEEDS_FOLLOW_UP", "RESOLVED", "HIDDEN", "IGNORED", "ESCALATED"])
    .optional(),
  priority: z
    .enum(["LOW", "NORMAL", "HIGH", "URGENT", "SALES_OPPORTUNITY"])
    .optional(),
  assignedUser: z.string().nullable().optional(),
});

router.patch(
  "/:id",
  validateBody(updateCommentSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.socialComment.findUnique({ where: { id } });
    if (!existing) throw notFound("Comment", id);

    const body = req.body as z.infer<typeof updateCommentSchema>;
    const comment = await prisma.socialComment.update({
      where: { id },
      data: {
        ...(body.status !== undefined ? { status: body.status as never } : {}),
        ...(body.priority !== undefined ? { priority: body.priority as never } : {}),
        ...(body.assignedUser !== undefined ? { assignedUser: body.assignedUser } : {}),
      },
      include: { replies: true, notes: true },
    });
    sendSuccess(res, comment);
  },
);

// ─── Hide comment ─────────────────────────────────────────────────────────────
router.patch("/:id/hide", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.socialComment.findUnique({ where: { id } });
  if (!existing) throw notFound("Comment", id);

  const [comment] = await prisma.$transaction([
    prisma.socialComment.update({
      where: { id },
      data: { status: "HIDDEN" },
      include: { replies: true, notes: true },
    }),
    prisma.socialInboxSyncLog.create({
      data: {
        platform: existing.platform,
        accountId: existing.accountId ?? undefined,
        actionType: "comment_hidden",
        status: "success",
        relatedCommenter: existing.commenterHandle ?? existing.commenterName,
      },
    }),
  ]);

  sendSuccess(res, comment);
});

// ─── Assign comment ───────────────────────────────────────────────────────────
const assignSchema = z.object({
  assignedUser: z.string().nullable(),
});

router.patch(
  "/:id/assign",
  validateBody(assignSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.socialComment.findUnique({ where: { id } });
    if (!existing) throw notFound("Comment", id);

    const body = req.body as z.infer<typeof assignSchema>;

    const [comment] = await prisma.$transaction([
      prisma.socialComment.update({
        where: { id },
        data: { assignedUser: body.assignedUser },
        include: { replies: true, notes: true },
      }),
      prisma.socialInboxSyncLog.create({
        data: {
          platform: existing.platform,
          accountId: existing.accountId ?? undefined,
          actionType: "assignment_updated",
          status: "success",
          relatedCommenter: existing.commenterHandle ?? existing.commenterName,
        },
      }),
    ]);

    sendSuccess(res, comment);
  },
);

// ─── Send reply ───────────────────────────────────────────────────────────────
const replySchema = z.object({
  replyText: z.string().min(1).max(2200),
  sentBy: z.string().optional(),
});

router.post(
  "/:id/replies",
  validateBody(replySchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.socialComment.findUnique({ where: { id } });
    if (!existing) throw notFound("Comment", id);

    const body = req.body as z.infer<typeof replySchema>;

    const [reply] = await prisma.$transaction([
      prisma.socialCommentReply.create({
        data: {
          commentId: id,
          replyText: body.replyText,
          sentBy: body.sentBy ?? "admin",
          status: "sent",
        },
      }),
      prisma.socialComment.update({
        where: { id },
        data: { status: "REPLIED", replyCount: { increment: 1 } },
      }),
      prisma.socialInboxSyncLog.create({
        data: {
          platform: existing.platform,
          accountId: existing.accountId ?? undefined,
          actionType: "reply_sent",
          status: "success",
          relatedPost: existing.originalPostTitle,
          relatedCommenter: existing.commenterHandle ?? existing.commenterName,
        },
      }),
    ]);

    sendSuccess(res, reply, undefined, 201);
  },
);

// ─── Add internal note ────────────────────────────────────────────────────────
const noteSchema = z.object({
  noteText: z.string().min(1).max(2000),
  createdBy: z.string().optional(),
});

router.post(
  "/:id/notes",
  validateBody(noteSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.socialComment.findUnique({ where: { id } });
    if (!existing) throw notFound("Comment", id);

    const body = req.body as z.infer<typeof noteSchema>;
    const note = await prisma.socialInboxNote.create({
      data: {
        commentId: id,
        noteText: body.noteText,
        createdBy: body.createdBy ?? "admin",
      },
    });
    sendSuccess(res, note, undefined, 201);
  },
);

export default router;
