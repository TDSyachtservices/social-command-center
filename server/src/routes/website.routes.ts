import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { validateBody, validateQuery } from "../utils/validation.js";
import { requireInternalApiKey } from "../utils/auth.js";

const router = Router();

// ─── GET /api/website/posts (public-safe, internal-key required) ───────────────
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  platform: z.literal("WEBSITE").default("WEBSITE"),
});

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
