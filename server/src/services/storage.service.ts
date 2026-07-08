import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";
import { badRequest } from "../utils/errors.js";

/**
 * Cloudflare R2 (S3-compatible) object storage.
 *
 * Env vars (see .env.example — these were already scaffolded there before this
 * service existed, so we reuse that naming instead of introducing a parallel
 * R2_* set):
 *   S3_ENDPOINT          e.g. https://<account-id>.r2.cloudflarestorage.com
 *   S3_REGION            "auto" for R2
 *   S3_BUCKET            bucket name
 *   S3_ACCESS_KEY_ID     R2 API token access key id
 *   S3_SECRET_ACCESS_KEY R2 API token secret
 *   S3_PUBLIC_BASE_URL   public domain bound to the bucket (custom domain or pub-*.r2.dev)
 *   S3_FORCE_PATH_STYLE  "true" for R2 (matches S3 path-style addressing)
 *
 * R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY must NEVER be sent to the frontend —
 * only this module (server-side) touches them.
 */

export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
] as const;
export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

const MAX_SIZE_BYTES: Record<"image" | "video", number> = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
};

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

let cachedClient: S3Client | null = null;

function isConfigured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  if (!isConfigured()) {
    throw badRequest(
      "Object storage is not configured — set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.",
    );
  }
  cachedClient = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "auto",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
  });
  return cachedClient;
}

/** Reject anything outside the allowlist before we ever touch the storage client. */
export function assertAllowedContentType(contentType: string): asserts contentType is AllowedContentType {
  if (!ALLOWED_CONTENT_TYPES.includes(contentType as AllowedContentType)) {
    throw badRequest(
      `Unsupported content type "${contentType}". Allowed: ${ALLOWED_CONTENT_TYPES.join(", ")}.`,
    );
  }
}

/** Reject files over the per-kind size limit. */
export function assertAllowedSize(contentType: string, sizeBytes: number): void {
  const kind = contentType.startsWith("video/") ? "video" : "image";
  const limit = MAX_SIZE_BYTES[kind];
  if (sizeBytes > limit) {
    throw badRequest(
      `File is too large (${Math.round(sizeBytes / 1024 / 1024)}MB). Max for ${kind}: ${Math.round(limit / 1024 / 1024)}MB.`,
    );
  }
}

/** Build a random, non-guessable object key. Never trust a client-supplied filename. */
function buildObjectKey(contentType: string): string {
  const ext = EXT_BY_CONTENT_TYPE[contentType] ?? "bin";
  return `media/${createId()}.${ext}`;
}

export function buildPublicUrl(key: string): string {
  let base = (process.env.S3_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) {
    throw badRequest("Object storage is not configured — set S3_PUBLIC_BASE_URL.");
  }
  // S3_PUBLIC_BASE_URL is sometimes set as a bare domain (no scheme) in Railway's
  // dashboard — default to https:// so downstream consumers (browsers, Facebook's
  // fetcher) get a usable absolute URL rather than a scheme-relative string.
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`;
  }
  return `${base}/${key}`;
}

export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

/**
 * Generate a presigned PUT URL the browser can upload directly to, bypassing
 * our server entirely for the (potentially large) file bytes. Expires in 5
 * minutes. Validates content type + size before issuing the URL.
 */
export async function createPresignedUpload(
  contentType: string,
  sizeBytes: number,
): Promise<PresignedUpload> {
  assertAllowedContentType(contentType);
  assertAllowedSize(contentType, sizeBytes);

  const key = buildObjectKey(contentType);
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 }); // 5 minutes

  return { uploadUrl, key, publicUrl: buildPublicUrl(key) };
}

/**
 * Upload a buffer directly from the server (used by the image-processing
 * pipeline to push the original + each generated platform crop to durable
 * storage after ImageMagick produces them locally).
 */
export async function putObjectBuffer(
  buffer: Buffer,
  contentType: string,
  keyHint?: string,
): Promise<{ key: string; publicUrl: string }> {
  const key = keyHint ?? buildObjectKey(contentType);
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return { key, publicUrl: buildPublicUrl(key) };
}

export async function deleteObject(key: string): Promise<void> {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
}

/**
 * Given a URL we previously handed out via buildPublicUrl, recover the R2
 * object key so we can delete it. Returns null if the URL doesn't point at
 * our configured R2 public base (e.g. it's a local /api/uploads/... URL, or
 * object storage isn't configured) — callers should treat that as "nothing
 * to delete in R2" rather than an error.
 */
export function keyFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let base = (process.env.S3_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) return null;
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  if (!url.startsWith(`${base}/`)) return null;
  return url.slice(base.length + 1);
}

export { isConfigured as isObjectStorageConfigured };
