import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { logger } from "../utils/logger.js";

const router = Router();

// ─── GET /api/webhook — Meta hub-challenge verification ───────────────────────
router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"] as string | undefined;
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken && challenge) {
    logger.info("Meta webhook verification succeeded");
    res.status(200).send(challenge);
    return;
  }

  logger.warn({ mode, tokenMatch: token === verifyToken }, "Meta webhook verification failed");
  res.status(403).json({ error: "Forbidden" });
});

// ─── POST /api/webhook — Meta event ingestion ─────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  // Always respond 200 quickly so Meta doesn't retry
  res.status(200).json({ received: true });

  const body = req.body as MetaWebhookBody;
  if (!body || !body.object || !Array.isArray(body.entry)) {
    logger.warn({ body }, "Malformed Meta webhook payload");
    return;
  }

  const platform = body.object === "instagram" ? "INSTAGRAM" : "FACEBOOK";

  for (const entry of body.entry) {
    const entryId = entry.id as string;
    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    for (const change of changes) {
      try {
        await ingestChange(platform, entryId, change);
      } catch (err) {
        logger.error({ err, entryId, field: change.field }, "Webhook change ingestion error");
      }
    }
  }
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    time?: number;
    changes?: MetaChange[];
    messaging?: unknown[];
  }>;
}

interface MetaChange {
  field: string;
  value: Record<string, unknown>;
}

// ─── Change ingestion ─────────────────────────────────────────────────────────

async function ingestChange(
  platform: string,
  entryId: string,
  change: MetaChange,
): Promise<void> {
  const field = change.field;
  const value = change.value ?? {};

  // Look up the account by its external page/IG-user id
  const account = await prisma.socialAccount.findFirst({
    where: { accountId: entryId, connectionStatus: "connected" },
  });

  const accountId = account?.id ?? null;

  let externalId: string | null = null;
  let type = "event";
  let title = "";
  let body: string | undefined;
  let occurredAt = new Date();

  if (field === "feed" || field === "posts") {
    // Facebook page comment / mention / reaction on feed
    const item = value.item as string | undefined;
    const commentId = (value.comment_id ?? value.commentId) as string | undefined;
    const postId = (value.post_id ?? value.postId) as string | undefined;
    const message = value.message as string | undefined;
    const fromName = (value.from as { name?: string } | undefined)?.name;
    const verb = value.verb as string | undefined;
    const ts = value.published_time ?? value.created_time;
    if (typeof ts === "number") occurredAt = new Date(ts * 1000);

    if (item === "comment" || field === "feed") {
      type = "comment";
      externalId = commentId ?? null;
      title = verb === "remove"
        ? `Comment removed${fromName ? ` by ${fromName}` : ""}`
        : `New comment${fromName ? ` from ${fromName}` : ""}${postId ? ` on post ${postId.split("_")[1] ?? postId}` : ""}`;
      body = message;
    } else if (item === "reaction") {
      type = "reaction";
      externalId = `${value.reaction_type as string}_${value.post_id as string}_${value.from_id as string}`;
      title = `New ${(value.reaction_type as string) ?? "reaction"} on post`;
    } else if (item === "mention") {
      type = "mention";
      externalId = commentId ?? null;
      title = `Page mentioned in a comment`;
      body = message;
    } else {
      type = item ?? "feed_event";
      title = `${platform} feed event: ${item ?? field}`;
    }
  } else if (field === "comments") {
    // Instagram comment
    const commentId = value.id as string | undefined;
    const text = value.text as string | undefined;
    const fromUsername = (value.from as { username?: string } | undefined)?.username;
    const ts = value.timestamp as number | undefined;
    if (ts) occurredAt = new Date(ts * 1000);

    type = "comment";
    externalId = commentId ?? null;
    title = `New comment${fromUsername ? ` from @${fromUsername}` : ""}`;
    body = text;
  } else if (field === "mentions") {
    // Instagram mention in a comment or caption
    const mediaId = value.media_id as string | undefined;
    const commentId = value.comment_id as string | undefined;

    type = "mention";
    externalId = commentId ?? mediaId ?? null;
    title = "Your account was mentioned";
  } else if (field === "messages" || field === "messaging_postbacks") {
    // Facebook/IG DM
    type = "message";
    title = `New ${platform === "INSTAGRAM" ? "Instagram" : "Facebook"} message`;
  } else if (field === "follower_changes" || field === "follows") {
    type = "follow";
    title = "New follower";
  } else {
    type = field;
    title = `${platform} event: ${field}`;
  }

  if (!title) return;

  // Upsert: if we have an externalId, deduplicate; otherwise always insert
  if (externalId) {
    await prisma.notification.upsert({
      where: { platform_externalId: { platform, externalId } },
      update: { title, body, payload: value as never, occurredAt },
      create: {
        platform,
        accountId,
        externalId,
        type,
        title,
        body,
        payload: value as never,
        occurredAt,
      },
    });
  } else {
    await prisma.notification.create({
      data: {
        platform,
        accountId,
        type,
        title,
        body,
        payload: value as never,
        occurredAt,
      },
    });
  }

  logger.info({ platform, type, title }, "Webhook notification ingested");
}

export default router;
