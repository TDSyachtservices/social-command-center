import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { decrypt } from "../utils/crypto.js";
import { logger } from "../utils/logger.js";

const router = Router();

// ─── Webhook Verification (GET) ───────────────────────────────────────────────
// Meta sends GET with hub.mode=subscribe, hub.verify_token, hub.challenge.
// Respond with the challenge to confirm ownership of the endpoint.
router.get("/facebook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.FB_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    logger.error("FB_WEBHOOK_VERIFY_TOKEN env var is not set");
    res.status(500).send("Webhook verify token not configured");
    return;
  }

  if (mode === "subscribe" && token === verifyToken) {
    logger.info("Facebook webhook endpoint verified");
    res.status(200).send(challenge);
    return;
  }

  logger.warn({ mode, providedToken: token }, "Facebook webhook verification failed — token mismatch");
  res.status(403).send("Forbidden");
});

// ─── Webhook Event Receiver (POST) ───────────────────────────────────────────
// Meta requires a <5 s acknowledgement, so we respond immediately and process async.
router.post("/facebook", (req: Request, res: Response) => {
  res.status(200).send("EVENT_RECEIVED");

  // Fire-and-forget; errors are logged but must not crash the process.
  void processWebhookPayload(req.body as FacebookWebhookBody).catch((err: unknown) => {
    logger.error({ err }, "Error processing Facebook webhook payload");
  });
});

// ─── Subscribe Page to Webhooks (POST) ───────────────────────────────────────
// One-time call per page: tells Meta to start sending feed events to our endpoint.
// Usage: POST /webhooks/facebook/subscribe?pageId=<page-id>
router.post("/facebook/subscribe", async (req: Request, res: Response) => {
  const { pageId } = req.query as { pageId?: string };
  if (!pageId) {
    res.status(400).json({ success: false, error: "pageId query param is required" });
    return;
  }

  const account = await prisma.socialAccount.findFirst({
    where: { accountId: pageId, platform: "FACEBOOK", connectionStatus: "connected" },
  });
  if (!account?.tokenEncrypted) {
    res.status(404).json({ success: false, error: "No connected Facebook account found for that pageId" });
    return;
  }

  const accessToken = decrypt(account.tokenEncrypted);
  const url = new URL(`https://graph.facebook.com/v19.0/${pageId}/subscribed_apps`);

  const fbRes = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, subscribed_fields: "feed" }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await fbRes.json()) as unknown;

  if (!fbRes.ok) {
    logger.error({ pageId, data }, "Facebook subscribed_apps call failed");
    res.status(fbRes.status).json({ success: false, error: data });
    return;
  }

  logger.info({ pageId }, "Facebook page subscribed to feed webhooks");
  sendSuccess(res, { subscribed: true, pageId, fbResponse: data });
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedChangeValue {
  from?: { id: string; name: string };
  message?: string;
  post_id?: string;
  comment_id?: string;
  parent_id?: string;
  created_time?: number;
  item?: string;
  verb?: string;
}

interface FacebookWebhookBody {
  object?: string;
  entry?: Array<{
    id: string;
    time: number;
    changes?: Array<{
      field: string;
      value: FeedChangeValue;
    }>;
  }>;
}

// ─── Processing logic ─────────────────────────────────────────────────────────

async function processWebhookPayload(body: FacebookWebhookBody): Promise<void> {
  if (body.object !== "page") return;

  for (const entry of body.entry ?? []) {
    const pageId = entry.id;

    const account = await prisma.socialAccount.findFirst({
      where: { accountId: pageId, platform: "FACEBOOK", connectionStatus: "connected" },
    });
    if (!account) {
      logger.warn({ pageId }, "Facebook webhook received for unknown/disconnected page — skipping");
      continue;
    }

    for (const change of entry.changes ?? []) {
      if (change.field !== "feed") continue;

      const v = change.value;

      // Only handle new top-level comment additions
      if (v.item !== "comment" || v.verb !== "add") continue;
      if (!v.comment_id || !v.post_id) continue;

      await upsertComment({ account, value: v });
    }
  }
}

async function upsertComment(opts: {
  account: { id: string; accountName: string };
  value: FeedChangeValue;
}): Promise<void> {
  const { account, value: v } = opts;
  const externalCommentId = v.comment_id!;
  const commenterName = v.from?.name ?? "Facebook User";
  const commentText = v.message ?? "";
  const createdTime = v.created_time ? new Date(v.created_time * 1000) : new Date();

  // Try to find the post in our scheduled posts for a better title
  const postPlatform = await prisma.scheduledPostPlatform.findFirst({
    where: { externalPostId: v.post_id, platform: "FACEBOOK" },
    include: { scheduledPost: { select: { title: true, caption: true } } },
  });
  const originalPostTitle = postPlatform?.scheduledPost.title ?? v.post_id ?? "Facebook post";
  const originalPostCaption = postPlatform?.scheduledPost.caption ?? "";

  const existing = await prisma.socialComment.findFirst({
    where: { externalCommentId },
  });

  if (existing) {
    // Backfill name if the row was created with a placeholder
    const hasPlaceholder =
      existing.commenterName === "Unknown" ||
      existing.commenterName === "Facebook User" ||
      existing.commenterName === null;

    if (v.from?.name && hasPlaceholder) {
      await prisma.socialComment.update({
        where: { id: existing.id },
        data: { commenterName: v.from.name },
      });
      logger.info({ externalCommentId, commenterName: v.from.name }, "Webhook backfilled commenter name");
    }
    return;
  }

  await prisma.socialComment.create({
    data: {
      platform: "FACEBOOK",
      accountId: account.id,
      accountName: account.accountName,
      commenterName,
      commentText,
      originalPostTitle,
      originalPostCaption,
      externalCommentId,
      timestamp: createdTime,
    },
  });

  logger.info({ externalCommentId, commenterName }, "Saved new comment from Facebook webhook");
}

export default router;
