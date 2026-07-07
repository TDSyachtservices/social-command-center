import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { validateBody } from "../utils/validation.js";
import { notFound } from "../utils/errors.js";

const router = Router();

const createHashtagSetSchema = z.object({
  name: z.string().min(1).max(200),
  platforms: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
});

const updateHashtagSetSchema = createHashtagSetSchema.partial();

// ─── GET /api/hashtag-sets ────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  const sets = await prisma.hashtagSet.findMany({ orderBy: { createdAt: "asc" } });
  sendSuccess(res, sets);
});

// ─── POST /api/hashtag-sets ───────────────────────────────────────────────────
router.post(
  "/",
  validateBody(createHashtagSetSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof createHashtagSetSchema>;
    const created = await prisma.hashtagSet.create({ data: body });
    sendSuccess(res, created, undefined, 201);
  },
);

// ─── PATCH /api/hashtag-sets/:id ──────────────────────────────────────────────
router.patch(
  "/:id",
  validateBody(updateHashtagSetSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.hashtagSet.findUnique({ where: { id } });
    if (!existing) throw notFound("Hashtag set", id);

    const body = req.body as z.infer<typeof updateHashtagSetSchema>;
    const updated = await prisma.hashtagSet.update({ where: { id }, data: body });
    sendSuccess(res, updated);
  },
);

// ─── DELETE /api/hashtag-sets/:id ─────────────────────────────────────────────
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.hashtagSet.findUnique({ where: { id } });
  if (!existing) throw notFound("Hashtag set", id);
  await prisma.hashtagSet.delete({ where: { id } });
  sendSuccess(res, { deleted: true });
});

export default router;
