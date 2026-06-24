import { Router, Request, Response } from "express";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../db/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { validateBody, validateQuery } from "../utils/validation.js";
import { notFound } from "../utils/errors.js";
import {
  processImage,
  cropToSpec,
  IMAGE_PLATFORM_SPECS,
  scoreQuality,
  type PlatformSpec,
  type FocalPoint,
  type ProcessedVersion,
} from "../services/media-processor.js";
import { logger } from "../utils/logger.js";

const router = Router();

/** Absolute public base for upload URLs (Railway domain in production). */
function buildPublicBase(): string {
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  return railwayDomain
    ? `https://${railwayDomain}`
    : (process.env.API_BASE_URL ?? "").replace(/\/$/, "");
}

function publicUrlFor(assetId: string, fileName: string, publicBase: string): string {
  return publicBase
    ? `${publicBase}/api/uploads/${assetId}/${fileName}`
    : `/api/uploads/${assetId}/${fileName}`;
}

/**
 * Replace an asset's MediaVersion rows from a freshly-processed set. Callers run
 * processImage first, so old rows are only dropped after processing succeeds and
 * a failed reprocess never destroys a working asset.
 */
async function persistVersions(
  assetId: string,
  versions: ProcessedVersion[],
  srcWidth: number,
  srcHeight: number,
) {
  const publicBase = buildPublicBase();
  await prisma.mediaVersion.deleteMany({ where: { mediaAssetId: assetId } });

  return Promise.all(
    versions.map((v) => {
      const fileName = path.basename(v.outputPath);
      const { score, label } = scoreQuality(srcWidth, srcHeight, v.spec);
      const reason = `Resolution-based score (${srcWidth}×${srcHeight} source → ${v.spec.width}×${v.spec.height} target). Re-score with AI for visual analysis.`;
      const validationStatus =
        label === "Poor" || label === "Needs Review" ? "NEEDS_REVIEW" : "READY";

      return prisma.mediaVersion.create({
        data: {
          mediaAssetId: assetId,
          platform: v.spec.platform as never,
          placement: v.spec.placement,
          width: v.spec.width,
          height: v.spec.height,
          aspectRatio: v.spec.aspectRatio,
          format: v.spec.format,
          mimeType: v.spec.mimeType,
          fileSizeBytes: BigInt(v.fileSizeBytes),
          storageKey: `uploads/${assetId}/${fileName}`,
          publicUrl: publicUrlFor(assetId, fileName, publicBase),
          processingStatus: "READY",
          cropMode: "fill",
          qualityScore: score,
          qualityScoreLabel: label,
          qualityScoreReason: reason,
          validationStatus: validationStatus as never,
        },
      });
    }),
  );
}

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

// ─── POST /api/media/:id/upload-file ─────────────────────────────────────────
// Accepts the raw file as a base64-encoded JSON body, runs ImageMagick to
// produce per-platform resizes, persists MediaVersion records, and returns
// the processed version manifest.
const uploadFileSchema = z.object({
  fileData: z.string().min(1),          // base64-encoded file bytes
  mimeType: z.string().min(1),
  fileName: z.string().optional(),
});

router.post(
  "/:id/upload-file",
  validateBody(uploadFileSchema),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const body = req.body as z.infer<typeof uploadFileSchema>;

    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw notFound("MediaAsset", id);

    const isVideo = body.mimeType.startsWith("video/");
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
    };
    const ext = extMap[body.mimeType] ?? (isVideo ? "mp4" : "jpg");

    const uploadDir = path.join(process.cwd(), "uploads", id);
    fs.mkdirSync(uploadDir, { recursive: true });

    const originalPath = path.join(uploadDir, `original.${ext}`);
    const fileBuffer = Buffer.from(body.fileData, "base64");
    fs.writeFileSync(originalPath, fileBuffer);

    // Build the public base URL.
    // RAILWAY_PUBLIC_DOMAIN is set automatically by Railway (e.g. "my-app.up.railway.app").
    // Fall back to API_BASE_URL (another custom var already in the Railway project) or empty.
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
    const publicBase = railwayDomain
      ? `https://${railwayDomain}`
      : (process.env.API_BASE_URL ?? "").replace(/\/$/, "");
    const originalUrl = publicBase
      ? `${publicBase}/api/uploads/${id}/original.${ext}`
      : `/api/uploads/${id}/original.${ext}`;

    await prisma.mediaAsset.update({
      where: { id },
      data: {
        originalStorageKey: `uploads/${id}/original.${ext}`,
        originalPublicUrl: originalUrl,
        processingStatus: "PROCESSING",
      },
    });

    if (isVideo) {
      // Video: store original only; platform-specific video processing is out
      // of scope for this pipeline iteration.
      await prisma.mediaAsset.update({
        where: { id },
        data: { processingStatus: "READY" },
      });
      sendSuccess(res, { assetId: id, originalUrl, versions: [] });
      return;
    }

    try {
      const versions = await processImage(
        originalPath,
        uploadDir,
        IMAGE_PLATFORM_SPECS,
        asset.originalWidth ?? 0,
        asset.originalHeight ?? 0,
      );

      // Replace any previous versions with the fresh set. The resolution
      // heuristic seeds each score; the frontend can re-score with AI vision
      // via /api/ai/score-image + PATCH /api/media/version/:id/score.
      const versionRows = await persistVersions(
        id,
        versions,
        asset.originalWidth ?? 0,
        asset.originalHeight ?? 0,
      );

      await prisma.mediaAsset.update({
        where: { id },
        data: { processingStatus: "READY", qualityScoreLabel: "Good" },
      });

      sendSuccess(res, {
        assetId: id,
        originalUrl,
        versions: versionRows.map((v) => ({
          id: v.id,
          platform: v.platform,
          placement: v.placement,
          width: v.width,
          height: v.height,
          url: v.publicUrl,
          qualityScore: v.qualityScore,
          qualityScoreLabel: v.qualityScoreLabel,
          qualityScoreReason: v.qualityScoreReason,
        })),
      });
    } catch (err) {
      await prisma.mediaAsset.update({
        where: { id },
        data: { processingStatus: "FAILED" },
      });
      throw err;
    }
  },
);

// ─── POST /api/media/:id/process ──────────────────────────────────────────────
// Re-generate every platform version from the stored original, synchronously.
// ImageMagick runs inline (there is no background worker), so an asset can never
// get stuck in PROCESSING. If no original file is stored, it errors without
// changing state.
router.post("/:id/process", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw notFound("MediaAsset", id);

  if (asset.originalFileType === "video") {
    sendError(res, "BAD_REQUEST", "Video assets are not processed by the image pipeline.");
    return;
  }
  if (!asset.originalStorageKey) {
    sendError(res, "BAD_REQUEST", "No original file is stored for this asset — re-upload it first.");
    return;
  }
  const originalPath = path.join(process.cwd(), asset.originalStorageKey);
  if (!fs.existsSync(originalPath)) {
    sendError(res, "BAD_REQUEST", "The original file is missing on the server — re-upload it first.");
    return;
  }
  const uploadDir = path.dirname(originalPath);

  try {
    const versions = await processImage(
      originalPath,
      uploadDir,
      IMAGE_PLATFORM_SPECS,
      asset.originalWidth ?? 0,
      asset.originalHeight ?? 0,
    );
    const versionRows = await persistVersions(
      id,
      versions,
      asset.originalWidth ?? 0,
      asset.originalHeight ?? 0,
    );
    await prisma.mediaAsset.update({
      where: { id },
      data: { processingStatus: "READY", qualityScoreLabel: "Good" },
    });

    sendSuccess(res, {
      assetId: id,
      versions: versionRows.map((v) => ({
        id: v.id,
        platform: v.platform,
        placement: v.placement,
        width: v.width,
        height: v.height,
        url: v.publicUrl,
        qualityScore: v.qualityScore,
        qualityScoreLabel: v.qualityScoreLabel,
        qualityScoreReason: v.qualityScoreReason,
      })),
    });
  } catch (err) {
    await prisma.mediaAsset.update({
      where: { id },
      data: { processingStatus: "FAILED" },
    });
    throw err;
  }
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
    const body = req.body as z.infer<typeof focalPointSchema>;

    const [asset, version] = await Promise.all([
      prisma.mediaAsset.findUnique({ where: { id } }),
      prisma.mediaVersion.findFirst({ where: { id: versionId, mediaAssetId: id } }),
    ]);
    if (!asset) throw notFound("MediaAsset", id);
    if (!version) throw notFound("MediaVersion", versionId);

    // Re-cutting requires the stored original and a known output target.
    if (!asset.originalStorageKey || !version.storageKey) {
      sendError(
        res,
        "BAD_REQUEST",
        "The original file is not available on the server — re-upload the image to enable cropping.",
      );
      return;
    }
    const originalPath = path.join(process.cwd(), asset.originalStorageKey);
    const outputPath = path.join(process.cwd(), version.storageKey);
    if (!fs.existsSync(originalPath)) {
      sendError(
        res,
        "BAD_REQUEST",
        "The original file is missing on the server — re-upload the image to enable cropping.",
      );
      return;
    }

    const spec: PlatformSpec = {
      platform: version.platform as string,
      placement: version.placement,
      width: version.width,
      height: version.height,
      aspectRatio: version.aspectRatio,
      format: version.format,
      mimeType: version.mimeType,
    };
    const focal: FocalPoint = { x: body.x, y: body.y };

    // Actually re-cut the image around the focal point and atomically overwrite
    // the version's output file.
    const fileSizeBytes = await cropToSpec(
      originalPath,
      outputPath,
      spec,
      focal,
      asset.originalWidth ?? 0,
      asset.originalHeight ?? 0,
    );

    // The pixels changed, so any earlier quality score is stale — clear it and
    // flag the version so the user re-runs the AI quality check.
    const updated = await prisma.mediaVersion.update({
      where: { id: versionId },
      data: {
        focalPointJson: body as never,
        cropMode: "focal",
        fileSizeBytes: BigInt(fileSizeBytes),
        processingStatus: "READY",
        qualityScore: null,
        qualityScoreLabel: null,
        qualityScoreReason: "Crop changed — run the AI quality check again.",
        validationStatus: "NEEDS_REVIEW",
      },
    });
    sendSuccess(res, updated);
  },
);

// ─── PATCH /api/media/version/:versionId/score ────────────────────────────────
// Write an AI quality score back to a specific version.
// Called by the frontend after it proxies the AI call through the Replit api-server.
const versionScoreSchema = z.object({
  qualityScore: z.number().min(0).max(1),
  qualityScoreLabel: z.enum(["Excellent", "Good", "Needs Review", "Poor"]),
  qualityScoreReason: z.string().max(500),
});

router.patch(
  "/version/:versionId/score",
  validateBody(versionScoreSchema),
  async (req: Request<{ versionId: string }>, res: Response) => {
    const { versionId } = req.params;
    const body = req.body as z.infer<typeof versionScoreSchema>;

    const version = await prisma.mediaVersion.findUnique({ where: { id: versionId } });
    if (!version) throw notFound("MediaVersion", versionId);

    const validationStatus =
      body.qualityScoreLabel === "Poor" || body.qualityScoreLabel === "Needs Review"
        ? "NEEDS_REVIEW"
        : "READY";

    const updated = await prisma.mediaVersion.update({
      where: { id: versionId },
      data: {
        qualityScore: body.qualityScore,
        qualityScoreLabel: body.qualityScoreLabel,
        qualityScoreReason: body.qualityScoreReason,
        validationStatus: validationStatus as never,
      },
    });

    sendSuccess(res, {
      id: updated.id,
      qualityScore: updated.qualityScore,
      qualityScoreLabel: updated.qualityScoreLabel,
      qualityScoreReason: updated.qualityScoreReason,
      validationStatus: updated.validationStatus,
    });
  },
);

// ─── DELETE /api/media/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw notFound("MediaAsset", id);
  await prisma.mediaAsset.delete({ where: { id } }); // versions + jobs cascade

  // Remove the on-disk files for this asset (best effort).
  try {
    fs.rmSync(path.join(process.cwd(), "uploads", id), { recursive: true, force: true });
  } catch (err) {
    logger.warn({ err, id }, "Failed to remove upload directory on delete");
  }

  sendSuccess(res, { deleted: true });
});

// ─── POST /api/media/:id/duplicate ────────────────────────────────────────────
// Create an independent server-side copy: a new asset row, copied on-disk files,
// and copied version rows with every storage key / public URL rewritten to the
// new asset id. Rolls back the new asset + files if the copy fails partway.
router.post("/:id/duplicate", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    include: { versions: true },
  });
  if (!asset) throw notFound("MediaAsset", id);

  const dotIndex = asset.originalFileName.lastIndexOf(".");
  const copyName =
    dotIndex > 0
      ? `${asset.originalFileName.slice(0, dotIndex)} (copy)${asset.originalFileName.slice(dotIndex)}`
      : `${asset.originalFileName} (copy)`;

  const newAsset = await prisma.mediaAsset.create({
    data: {
      originalFileName: copyName,
      originalFileType: asset.originalFileType,
      originalMimeType: asset.originalMimeType,
      originalSizeBytes: asset.originalSizeBytes,
      originalWidth: asset.originalWidth,
      originalHeight: asset.originalHeight,
      originalDurationSeconds: asset.originalDurationSeconds,
      uploadedBy: asset.uploadedBy,
      processingStatus: asset.processingStatus,
      validationStatus: asset.validationStatus,
      qualityScoreLabel: asset.qualityScoreLabel,
    },
  });

  try {
    const publicBase = buildPublicBase();
    const srcDir = path.join(process.cwd(), "uploads", id);
    const dstDir = path.join(process.cwd(), "uploads", newAsset.id);
    // If the DB says this asset has files on disk but they're missing, fail (and
    // roll back) instead of creating a copy whose storage keys point at nothing.
    const expectsFiles =
      Boolean(asset.originalStorageKey) || asset.versions.some((v) => Boolean(v.storageKey));
    if (expectsFiles && !fs.existsSync(srcDir)) {
      throw new Error(`Cannot duplicate ${id}: source files are missing on disk.`);
    }
    if (fs.existsSync(srcDir)) {
      fs.cpSync(srcDir, dstDir, { recursive: true });
    }

    // Rewrite the original file's key/url to the new asset id.
    let newOriginalKey: string | null = null;
    let newOriginalUrl: string | null = null;
    if (asset.originalStorageKey) {
      const base = path.basename(asset.originalStorageKey);
      newOriginalKey = `uploads/${newAsset.id}/${base}`;
      newOriginalUrl = publicUrlFor(newAsset.id, base, publicBase);
    }
    await prisma.mediaAsset.update({
      where: { id: newAsset.id },
      data: { originalStorageKey: newOriginalKey, originalPublicUrl: newOriginalUrl },
    });

    // Copy version rows with keys/urls rewritten to the new asset id.
    for (const v of asset.versions) {
      const base = v.storageKey ? path.basename(v.storageKey) : null;
      await prisma.mediaVersion.create({
        data: {
          mediaAssetId: newAsset.id,
          platform: v.platform,
          placement: v.placement,
          width: v.width,
          height: v.height,
          aspectRatio: v.aspectRatio,
          format: v.format,
          mimeType: v.mimeType,
          fileSizeBytes: v.fileSizeBytes,
          storageKey: base ? `uploads/${newAsset.id}/${base}` : null,
          publicUrl: base ? publicUrlFor(newAsset.id, base, publicBase) : null,
          processingStatus: v.processingStatus,
          cropMode: v.cropMode,
          focalPointJson: (v.focalPointJson ?? undefined) as never,
          qualityScore: v.qualityScore,
          qualityScoreLabel: v.qualityScoreLabel,
          qualityScoreReason: v.qualityScoreReason,
          validationStatus: v.validationStatus,
        },
      });
    }

    const full = await prisma.mediaAsset.findUnique({
      where: { id: newAsset.id },
      include: { versions: { orderBy: [{ platform: "asc" }, { placement: "asc" }] } },
    });
    sendSuccess(res, full, undefined, 201);
  } catch (err) {
    // Roll back the partial copy so we never leave an orphaned asset/files.
    try {
      await prisma.mediaAsset.delete({ where: { id: newAsset.id } });
    } catch {
      /* ignore rollback failure */
    }
    try {
      fs.rmSync(path.join(process.cwd(), "uploads", newAsset.id), {
        recursive: true,
        force: true,
      });
    } catch {
      /* ignore rollback failure */
    }
    throw err;
  }
});

export default router;
