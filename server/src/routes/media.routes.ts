import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { validateBody, validateQuery } from "../utils/validation.js";
import { notFound } from "../utils/errors.js";

const router = Router();

const listQuerySchema = z.object({
  type: z.enum(["image", "video", "all"]).default("all"),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ─── GET /api/media ───────────────────────────────────────────────────────────
router.get(
  "/",
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    const q = (
      req as Request & { validatedQuery: z.infer<typeof listQuerySchema> }
    ).validatedQuery;

    const where = {
      ...(q.type !== "all" ? { originalFileType: q.type } : {}),
      ...(q.status ? { processingStatus: q.status as never } : {}),
    };

    const [total, assets] = await Promise.all([
      prisma.mediaAsset.count({ where }),
      prisma.mediaAsset.findMany({
        where,
        include: { versions: { orderBy: [{ platform: "asc" }, { placement: "asc" }] } },
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);

    sendSuccess(res, assets, { total, page: q.page, limit: q.limit });
  },
);

// ─── GET /api/media/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    include: {
      versions: { orderBy: [{ platform: "asc" }, { placement: "asc" }] },
      processingJobs: { orderBy: { queuedAt: "desc" }, take: 20 },
    },
  });
  if (!asset) throw notFound("MediaAsset", id);
  sendSuccess(res, asset);
});

// ─── GET /api/media/:id/versions ─────────────────────────────────────────────
router.get("/:id/versions", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw notFound("MediaAsset", id);

  const versions = await prisma.mediaVersion.findMany({
    where: { mediaAssetId: id },
    orderBy: [{ platform: "asc" }, { placement: "asc" }],
  });
  sendSuccess(res, versions);
});

// ─── POST /api/media/upload-intent ────────────────────────────────────────────
const uploadIntentSchema = z.object({
  fileName: z.string().min(1).max(260),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  originalWidth: z.number().int().positive().optional(),
  originalHeight: z.number().int().positive().optional(),
  originalDurationSeconds: z.number().positive().optional(),
  uploadedBy: z.string().optional(),
});

router.post(
  "/upload-intent",
  validateBody(uploadIntentSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof uploadIntentSchema>;

    const asset = await prisma.mediaAsset.create({
      data: {
        originalFileName: body.fileName,
        originalFileType: body.mimeType.startsWith("video") ? "video" : "image",
        originalMimeType: body.mimeType,
        originalSizeBytes: BigInt(body.fileSizeBytes),
        originalWidth: body.originalWidth ?? null,
        originalHeight: body.originalHeight ?? null,
        originalDurationSeconds: body.originalDurationSeconds ?? null,
        uploadedBy: body.uploadedBy ?? null,
        processingStatus: "UPLOADED",
        validationStatus: "NEEDS_REVIEW",
      },
    });

    sendSuccess(
      res,
      {
        assetId: asset.id,
        uploadUrl: `MOCK_UPLOAD_URL:${asset.id}`,
        note: "S3 pre-signed URL not yet configured.",
      },
      undefined,
      201,
    );
  },
);

// ─── POST /api/media/:id/process ──────────────────────────────────────────────
router.post("/:id/process", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw notFound("MediaAsset", id);

  if (!["UPLOADED", "NEEDS_REVIEW", "FAILED"].includes(asset.processingStatus)) {
    sendError(res, "BAD_REQUEST", `Asset is already in status '${asset.processingStatus}'`);
    return;
  }

  const job = await prisma.mediaProcessingJob.create({
    data: { mediaAssetId: id, jobType: "generate_versions", status: "queued" },
  });

  await prisma.mediaAsset.update({
    where: { id },
    data: { processingStatus: "PROCESSING" },
  });

  sendSuccess(res, { jobId: job.id, status: "queued" });
});

// ─── PATCH /api/media/:id/version/:versionId/focal-point ──────────────────────
const focalPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

router.patch(
  "/:id/version/:versionId/focal-point",
  validateBody(focalPointSchema),
  async (req: Request<{ id: string; versionId: string }>, res: Response) => {
    const { id, versionId } = req.params;
    const version = await prisma.mediaVersion.findFirst({
      where: { id: versionId, mediaAssetId: id },
    });
    if (!version) throw notFound("MediaVersion", versionId);

    const updated = await prisma.mediaVersion.update({
      where: { id: versionId },
      data: { focalPointJson: req.body as never, processingStatus: "PENDING" },
    });
    sendSuccess(res, updated);
  },
);

// ─── DELETE /api/media/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw notFound("MediaAsset", id);
  await prisma.mediaAsset.delete({ where: { id } });
  sendSuccess(res, { deleted: true });
});

export default router;
