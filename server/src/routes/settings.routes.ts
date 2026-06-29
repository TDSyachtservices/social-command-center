import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

// ─── GET /api/settings ────────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  const rows = await prisma.setting.findMany();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  sendSuccess(res, settings);
});

// ─── GET /api/settings/:key ───────────────────────────────────────────────────
router.get("/:key", async (req: Request<{ key: string }>, res: Response) => {
  const { key } = req.params;
  const row = await prisma.setting.findUnique({ where: { key } });
  sendSuccess(res, row ? { key: row.key, value: row.value } : null);
});

// ─── PUT /api/settings/:key ───────────────────────────────────────────────────
const upsertSettingSchema = z.object({
  value: z.unknown(),
});

router.put(
  "/:key",
  validateBody(upsertSettingSchema),
  async (req: Request<{ key: string }>, res: Response) => {
    const { key } = req.params;
    const { value } = req.body as { value: unknown };
    const row = await prisma.setting.upsert({
      where: { key },
      create: { key, value: value as never },
      update: { value: value as never },
    });
    sendSuccess(res, row);
  },
);

// ─── PATCH /api/settings (bulk) ───────────────────────────────────────────────
const bulkUpdateSchema = z.record(z.string(), z.unknown());

router.patch(
  "/",
  validateBody(bulkUpdateSchema),
  async (req: Request, res: Response) => {
    const entries = Object.entries(req.body as Record<string, unknown>);

    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          create: { key, value: value as never },
          update: { value: value as never },
        }),
      ),
    );

    const rows = await prisma.setting.findMany();
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    sendSuccess(res, settings);
  },
);

export default router;
