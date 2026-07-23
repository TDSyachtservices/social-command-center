import { Router, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { validateBody } from "../utils/validation.js";
import { notFound } from "../utils/errors.js";

const router = Router();

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  postType: z.string().default("standard"),
  platforms: z.array(z.string()).default([]),
  masterCaption: z.string().default(""),
  platformCaptionsJson: z.record(z.string()).nullable().optional(),
  hashtagsJson: z.record(z.array(z.string())).nullable().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

// ─── GET /api/templates ───────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  const templates = await prisma.postTemplate.findMany({ orderBy: { createdAt: "asc" } });
  sendSuccess(res, templates);
});

// ─── GET /api/templates/:id ───────────────────────────────────────────────────
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const template = await prisma.postTemplate.findUnique({ where: { id } });
  if (!template) throw notFound("Template", id);
  sendSuccess(res, template);
});

function toJsonValue(v: Record<string, unknown> | null | undefined): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
  if (v === null) return Prisma.JsonNull;
  if (v === undefined) return undefined;
  return v as Prisma.InputJsonValue;
}

// ─── POST /api/templates ──────────────────────────────────────────────────────
router.post(
  "/",
  validateBody(createTemplateSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof createTemplateSchema>;
    const created = await prisma.postTemplate.create({
      data: {
        ...body,
        platformCaptionsJson: toJsonValue(body.platformCaptionsJson as Record<string, unknown> | null | undefined),
        hashtagsJson: toJsonValue(body.hashtagsJson as Record<string, unknown> | null | undefined),
      },
    });
    sendSuccess(res, created, undefined, 201);
  },
);

// ─── PATCH /api/templates/:id ─────────────────────────────────────────────────
router.patch(
  "/:id",
  validateBody(updateTemplateSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.postTemplate.findUnique({ where: { id } });
    if (!existing) throw notFound("Template", id);

    const body = req.body as z.infer<typeof updateTemplateSchema>;
    const updated = await prisma.postTemplate.update({
      where: { id },
      data: {
        ...body,
        platformCaptionsJson: toJsonValue(body.platformCaptionsJson as Record<string, unknown> | null | undefined),
        hashtagsJson: toJsonValue(body.hashtagsJson as Record<string, unknown> | null | undefined),
      },
    });
    sendSuccess(res, updated);
  },
);

// ─── DELETE /api/templates/:id ────────────────────────────────────────────────
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.postTemplate.findUnique({ where: { id } });
  if (!existing) throw notFound("Template", id);
  await prisma.postTemplate.delete({ where: { id } });
  sendSuccess(res, { deleted: true });
});

export default router;
