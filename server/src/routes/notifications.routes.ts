import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { validateQuery } from "../utils/validation.js";
import { notFound } from "../utils/errors.js";

const router = Router();

// ─── GET /api/notifications ────────────────────────────────────────────────────
const listQuerySchema = z.object({
  platform: z.string().optional(),
  type: z.string().optional(),
  unreadOnly: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

router.get(
  "/",
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    const q = (
      req as Request & { validatedQuery: z.infer<typeof listQuerySchema> }
    ).validatedQuery;

    const where = {
      ...(q.platform ? { platform: q.platform.toUpperCase() } : {}),
      ...(q.type ? { type: q.type } : {}),
      ...(q.unreadOnly === "true" ? { isRead: false } : {}),
    };

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true,
          platform: true,
          accountId: true,
          externalId: true,
          type: true,
          title: true,
          body: true,
          isRead: true,
          occurredAt: true,
          createdAt: true,
        },
      }),
    ]);

    sendSuccess(res, notifications, { total, page: q.page, limit: q.limit });
  },
);

// ─── GET /api/notifications/unread-count ──────────────────────────────────────
router.get("/unread-count", async (req: Request, res: Response) => {
  const platform = req.query.platform as string | undefined;

  const where = {
    isRead: false,
    ...(platform ? { platform: platform.toUpperCase() } : {}),
  };

  const count = await prisma.notification.count({ where });
  sendSuccess(res, { count });
});

// ─── PATCH /api/notifications/:id/read ────────────────────────────────────────
router.patch("/:id/read", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing) throw notFound("Notification", id);

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  sendSuccess(res, updated);
});

// ─── POST /api/notifications/read-all ─────────────────────────────────────────
router.post("/read-all", async (req: Request, res: Response) => {
  const platform = req.body?.platform as string | undefined;

  const where = {
    isRead: false,
    ...(platform ? { platform: platform.toUpperCase() } : {}),
  };

  const result = await prisma.notification.updateMany({
    where,
    data: { isRead: true },
  });
  sendSuccess(res, { marked: result.count });
});

// ─── GET /api/notifications/platform-stats ────────────────────────────────────
router.get("/platform-stats", async (req: Request, res: Response) => {
  const platform = req.query.platform as string | undefined;
  const accountId = req.query.accountId as string | undefined;

  const where = {
    ...(platform ? { platform: platform.toUpperCase() } : {}),
    ...(accountId ? { accountId } : {}),
  };

  const stats = await prisma.platformStats.findMany({
    where,
    orderBy: { polledAt: "desc" },
    take: 48,
    select: {
      id: true,
      platform: true,
      accountId: true,
      followersCount: true,
      polledAt: true,
    },
  });

  sendSuccess(res, stats);
});

export default router;
