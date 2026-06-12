import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { validateBody, validateQuery } from "../utils/validation.js";
import { notFound } from "../utils/errors.js";

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
