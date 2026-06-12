import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { validateQuery } from "../utils/validation.js";

const router = Router();

const listQuerySchema = z.object({
  type: z.enum(["publish", "comment", "all"]).default("all"),
  status: z.string().optional(),
  platform: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ─── GET /api/logs ────────────────────────────────────────────────────────────
router.get(
  "/",
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    const q = (
      req as Request & { validatedQuery: z.infer<typeof listQuerySchema> }
    ).validatedQuery;

    const [publishLogs, commentLogs] = await Promise.all([
      q.type !== "comment"
        ? prisma.publishLog.findMany({
            where: {
              ...(q.status ? { status: q.status } : {}),
              ...(q.platform ? { platform: q.platform as never } : {}),
            },
            orderBy: { timestamp: "desc" },
            skip: (q.page - 1) * q.limit,
            take: q.limit,
          })
        : Promise.resolve([]),
      q.type !== "publish"
        ? prisma.socialInboxSyncLog.findMany({
            where: {
              ...(q.status ? { status: q.status } : {}),
              ...(q.platform ? { platform: q.platform as never } : {}),
            },
            orderBy: { timestamp: "desc" },
            skip: (q.page - 1) * q.limit,
            take: q.limit,
          })
        : Promise.resolve([]),
    ]);

    sendSuccess(res, { publishLogs, commentLogs });
  },
);

// ─── GET /api/logs/publish ────────────────────────────────────────────────────
router.get(
  "/publish",
  validateQuery(
    z.object({
      status: z.string().optional(),
      platform: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  ),
  async (req: Request, res: Response) => {
    const q = (
      req as Request & {
        validatedQuery: { status?: string; platform?: string; page: number; limit: number };
      }
    ).validatedQuery;

    const [total, logs] = await Promise.all([
      prisma.publishLog.count({
        where: {
          ...(q.status ? { status: q.status } : {}),
          ...(q.platform ? { platform: q.platform as never } : {}),
        },
      }),
      prisma.publishLog.findMany({
        where: {
          ...(q.status ? { status: q.status } : {}),
          ...(q.platform ? { platform: q.platform as never } : {}),
        },
        orderBy: { timestamp: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);

    sendSuccess(res, logs, { total, page: q.page, limit: q.limit });
  },
);

// ─── GET /api/logs/comment ────────────────────────────────────────────────────
router.get(
  "/comment",
  validateQuery(
    z.object({
      status: z.string().optional(),
      platform: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  ),
  async (req: Request, res: Response) => {
    const q = (
      req as Request & {
        validatedQuery: { status?: string; platform?: string; page: number; limit: number };
      }
    ).validatedQuery;

    const [total, logs] = await Promise.all([
      prisma.socialInboxSyncLog.count({
        where: {
          ...(q.status ? { status: q.status } : {}),
          ...(q.platform ? { platform: q.platform as never } : {}),
        },
      }),
      prisma.socialInboxSyncLog.findMany({
        where: {
          ...(q.status ? { status: q.status } : {}),
          ...(q.platform ? { platform: q.platform as never } : {}),
        },
        orderBy: { timestamp: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);

    sendSuccess(res, logs, { total, page: q.page, limit: q.limit });
  },
);

// ─── GET /api/logs/audit ──────────────────────────────────────────────────────
router.get(
  "/audit",
  validateQuery(
    z.object({
      action: z.string().optional(),
      resourceType: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  ),
  async (req: Request, res: Response) => {
    const q = (
      req as Request & {
        validatedQuery: { action?: string; resourceType?: string; page: number; limit: number };
      }
    ).validatedQuery;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({
        where: {
          ...(q.action ? { action: { contains: q.action } } : {}),
          ...(q.resourceType ? { resourceType: q.resourceType } : {}),
        },
      }),
      prisma.auditLog.findMany({
        where: {
          ...(q.action ? { action: { contains: q.action } } : {}),
          ...(q.resourceType ? { resourceType: q.resourceType } : {}),
        },
        orderBy: { timestamp: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);

    sendSuccess(res, logs, { total, page: q.page, limit: q.limit });
  },
);

export default router;
