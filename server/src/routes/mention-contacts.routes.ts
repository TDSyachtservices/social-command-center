import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { validateBody } from "../utils/validation.js";
import { notFound } from "../utils/errors.js";

const router = Router();

const createMentionContactSchema = z.object({
  displayName: z.string().min(1).max(200),
  category: z.string().default(""),
  platforms: z.array(z.string()).default([]),
  handles: z.record(z.string(), z.string()).default({}),
  linkedinUrn: z.string().nullable().optional(),
});

const updateMentionContactSchema = createMentionContactSchema.partial();

// ─── GET /api/mention-contacts ────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  const contacts = await prisma.mentionContact.findMany({
    orderBy: { createdAt: "asc" },
  });
  sendSuccess(res, contacts);
});

// ─── POST /api/mention-contacts ───────────────────────────────────────────────
router.post(
  "/",
  validateBody(createMentionContactSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof createMentionContactSchema>;
    const created = await prisma.mentionContact.create({
      data: {
        displayName: body.displayName,
        category: body.category,
        platforms: body.platforms,
        handles: body.handles,
        linkedinUrn: body.linkedinUrn ?? null,
      },
    });
    sendSuccess(res, created, undefined, 201);
  },
);

// ─── PATCH /api/mention-contacts/:id ──────────────────────────────────────────
router.patch(
  "/:id",
  validateBody(updateMentionContactSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.mentionContact.findUnique({ where: { id } });
    if (!existing) throw notFound("Mention contact", id);

    const body = req.body as z.infer<typeof updateMentionContactSchema>;
    const updated = await prisma.mentionContact.update({
      where: { id },
      data: {
        ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.platforms !== undefined ? { platforms: body.platforms } : {}),
        ...(body.handles !== undefined ? { handles: body.handles } : {}),
        ...(body.linkedinUrn !== undefined ? { linkedinUrn: body.linkedinUrn } : {}),
      },
    });
    sendSuccess(res, updated);
  },
);

// ─── DELETE /api/mention-contacts/:id ─────────────────────────────────────────
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.mentionContact.findUnique({ where: { id } });
  if (!existing) throw notFound("Mention contact", id);
  await prisma.mentionContact.delete({ where: { id } });
  sendSuccess(res, { deleted: true });
});

export default router;
