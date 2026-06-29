import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { validateBody, validateQuery } from "../utils/validation.js";
import { requireInternalApiKey } from "../utils/auth.js";

const router = Router();

// ─── GET /api/website/status ──────────────────────────────────────────────────
router.get("/status", requireInternalApiKey, async (_req: Request, res: Response) => {
  const row = await prisma.setting.findUnique({ where: { key: "websiteApi" } });
  const config = (row?.value as Record<string, unknown>) ?? {};

  sendSuccess(res, {
    connected: true,
    endpoint: (config.endpoint as string | undefined) ?? process.env.WEBSITE_CMS_ENDPOINT ?? null,
    lastSync: (config.lastSync as string | undefined) ?? null,
    mock: true,
  });
});

// ─── GET /api/website/drafts ──────────────────────────────────────────────────
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  platform: z.literal("WEBSITE").default("WEBSITE"),
});

router.get(
  "/drafts",
  requireInternalApiKey,
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    const q = (
      req as Request & { validatedQuery: z.infer<typeof listQuerySchema> }
    ).validatedQuery;

    const posts = await prisma.scheduledPost.findMany({
      where: {
        status: { in: ["DRAFT", "SCHEDULED"] },
        platforms: { some: { platform: "WEBSITE" } },
      },
      orderBy: { updatedAt: "desc" },
      take: q.limit,
      include: {
        platforms: { where: { platform: "WEBSITE" } },
      },
    });

    sendSuccess(res, posts);
  },
);

// ─── POST /api/website/publish ────────────────────────────────────────────────
const publishSchema = z.object({
  postId: z.string().min(1),
  slug: z.string().min(1).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  bodyHtml: z.string().optional(),
});

router.post(
  "/publish",
  requireInternalApiKey,
  validateBody(publishSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof publishSchema>;

    const post = await prisma.scheduledPost.findUnique({ where: { id: body.postId } });
    if (!post) {
      sendSuccess(res, { published: false, error: "Post not found" });
      return;
    }

    await prisma.auditLog.create({
      data: {
        action: "website_publish",
        resourceType: "ScheduledPost",
        resourceId: body.postId,
        details: { slug: body.slug, mock: true } as never,
      },
    });

    sendSuccess(res, {
      published: true,
      postId: body.postId,
      slug: body.slug ?? post.id,
      url: `https://marinedeckingco.com/blog/${body.slug ?? post.id}`,
      mock: true,
      note: "Mock CMS publish — no real website API call",
    });
  },
);

// ─── GET /api/website/sync-logs ───────────────────────────────────────────────
router.get(
  "/sync-logs",
  requireInternalApiKey,
  validateQuery(
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }),
  ),
  async (req: Request, res: Response) => {
    const q = (
      req as Request & { validatedQuery: { page: number; limit: number } }
    ).validatedQuery;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where: { resourceType: "website" } }),
      prisma.auditLog.findMany({
        where: { resourceType: { in: ["website", "ScheduledPost"] }, action: { startsWith: "website" } },
        orderBy: { timestamp: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);

    sendSuccess(res, logs, { total, page: q.page, limit: q.limit });
  },
);

// ─── GET /api/website/posts (legacy — internal n8n feed) ──────────────────────
router.get(
  "/posts",
  requireInternalApiKey,
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    const q = (
      req as Request & { validatedQuery: z.infer<typeof listQuerySchema> }
    ).validatedQuery;

    const posts = await prisma.scheduledPost.findMany({
      where: {
        status: "PUBLISHED",
        platforms: { some: { platform: "WEBSITE" } },
      },
      orderBy: { publishedAt: "desc" },
      take: q.limit,
      include: {
        platforms: { where: { platform: "WEBSITE" } },
      },
    });

    sendSuccess(res, posts);
  },
);

// ─── POST /api/website/webhook ─────────────────────────────────────────────────
const webhookSchema = z.object({
  event: z.string(),
  postId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

router.post(
  "/webhook",
  requireInternalApiKey,
  validateBody(webhookSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof webhookSchema>;

    await prisma.auditLog.create({
      data: {
        action: `website_webhook:${body.event}`,
        resourceType: "website",
        resourceId: body.postId,
        details: body.payload as never,
      },
    });

    sendSuccess(res, { received: true, event: body.event });
  },
);

// ─── GET /api/website/settings ───────────────────────────────────────────────
router.get("/settings", requireInternalApiKey, async (_req: Request, res: Response) => {
  const row = await prisma.setting.findUnique({ where: { key: "websiteApi" } });
  sendSuccess(res, row?.value ?? {});
});

export default router;
