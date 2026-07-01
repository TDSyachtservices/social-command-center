import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { logger } from "../utils/logger.js";
import { parseChange, parseMessagingEvent, MetaMessagingEvent } from "../webhooks/meta-parser.js";

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
  // Respond 200 immediately so Meta doesn't retry
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
    const messagingEvents = Array.isArray(entry.messaging) ? entry.messaging : [];

    // Graph API change subscriptions (comments, feed, mentions, ratings, etc.)
    for (const change of changes) {
      try {
        const input = parseChange(platform, change);
        if (input) await persistNotification(platform, entryId, input, change.value);
      } catch (err) {
        logger.error({ err, entryId, field: change.field }, "Webhook change ingestion error");
      }
    }

    // Messenger / IG DM events arrive on entry.messaging, not entry.changes
    for (const event of messagingEvents) {
      try {
        const input = parseMessagingEvent(platform, event as MetaMessagingEvent);
        if (input) await persistNotification(platform, entryId, input, event as Record<string, unknown>);
      } catch (err) {
        logger.error({ err, entryId }, "Webhook messaging event ingestion error");
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
    changes?: Array<{ field: string; value: Record<string, unknown> }>;
    messaging?: unknown[];
  }>;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

async function persistNotification(
  platform: string,
  entryId: string,
  input: { type: string; title: string; externalId: string | null; body?: string; occurredAt: Date },
  payload: Record<string, unknown>,
): Promise<void> {
  const account = await prisma.socialAccount.findFirst({
    where: { accountId: entryId, connectionStatus: "connected" },
  });
  const accountId = account?.id ?? null;

  const { type, title, externalId, body, occurredAt } = input;

  if (externalId) {
    await prisma.notification.upsert({
      where: { platform_externalId: { platform, externalId } },
      update: { title, body, payload: payload as never, occurredAt },
      create: { platform, accountId, externalId, type, title, body, payload: payload as never, occurredAt },
    });
  } else {
    await prisma.notification.create({
      data: { platform, accountId, type, title, body, payload: payload as never, occurredAt },
    });
  }

  logger.info({ platform, type, title }, "Webhook notification ingested");
}

export default router;
