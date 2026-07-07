import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { validateBody } from "../utils/validation.js";
import { notFound } from "../utils/errors.js";

const router = Router();

const createMentionGroupSchema = z.object({
  name: z.string().min(1).max(200),
  contactIds: z.array(z.string()).default([]),
  platforms: z.array(z.string()).default([]),
});

const updateMentionGroupSchema = createMentionGroupSchema.partial();

// ─── GET /api/mention-groups ──────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  const groups = await prisma.mentionGroup.findMany({
    orderBy: { createdAt: "asc" },
  });
  sendSuccess(res, groups);
});

// ─── POST /api/mention-groups ─────────────────────────────────────────────────
router.post(
  "/",
  validateBody(createMentionGroupSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof createMentionGroupSchema>;
    const created = await prisma.mentionGroup.create({ data: body });
    sendSuccess(res, created, undefined, 201);
  },
);

// ─── PATCH /api/mention-groups/:id ────────────────────────────────────────────
router.patch(
  "/:id",
  validateBody(updateMentionGroupSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.mentionGroup.findUnique({ where: { id } });
    if (!existing) throw notFound("Mention group", id);

    const body = req.body as z.infer<typeof updateMentionGroupSchema>;
    const updated = await prisma.mentionGroup.update({ where: { id }, data: body });
    sendSuccess(res, updated);
  },
);

// ─── DELETE /api/mention-groups/:id ───────────────────────────────────────────
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.mentionGroup.findUnique({ where: { id } });
  if (!existing) throw notFound("Mention group", id);
  await prisma.mentionGroup.delete({ where: { id } });
  sendSuccess(res, { deleted: true });
});

export default router;
