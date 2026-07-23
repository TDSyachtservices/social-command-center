import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { decrypt } from "../utils/crypto.js";
import { getPageInsights } from "../adapters/facebook.js";
import { getIgInsights } from "../adapters/instagram.js";
import { logger } from "../utils/logger.js";

const router = Router();

// ─── GET /api/insights/facebook/:accountId ──────────────────────────────────
// Returns Page Insights for the given Facebook account.
// Requires the page token to have been granted the read_insights permission.
router.get("/facebook/:accountId", async (req: Request<{ accountId: string }>, res: Response) => {
  const { accountId } = req.params;

  const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
  if (!account) {
    sendError(res, "NOT_FOUND", `Account ${accountId} not found`, undefined, 404);
    return;
  }
  if (account.platform !== "FACEBOOK") {
    sendError(res, "BAD_REQUEST", "This endpoint only supports Facebook accounts", undefined, 400);
    return;
  }
  if (!account.tokenEncrypted) {
    sendError(res, "NOT_CONNECTED", "Account has no stored token — reconnect via OAuth", undefined, 422);
    return;
  }

  let accessToken: string;
  try {
    accessToken = decrypt(account.tokenEncrypted);
  } catch (err) {
    logger.warn({ accountId }, "Could not decrypt Facebook token");
    sendError(res, "TOKEN_ERROR", "Stored token could not be decrypted — reconnect via OAuth", undefined, 422);
    return;
  }

  try {
    const insights = await getPageInsights({ accessToken, pageId: account.accountId });
    sendSuccess(res, { accountId: account.id, pageId: account.accountId, accountName: account.accountName, ...insights });
  } catch (err) {
    logger.error({ accountId, err }, "Facebook insights fetch failed");
    sendError(res, "INSIGHTS_ERROR", err instanceof Error ? err.message : "Failed to fetch insights", undefined, 502);
  }
});

// ─── GET /api/insights/instagram/:accountId ─────────────────────────────────
// Returns Account Insights for the given Instagram account.
// Requires the token to have instagram_manage_insights permission.
router.get("/instagram/:accountId", async (req: Request<{ accountId: string }>, res: Response) => {
  const { accountId } = req.params;

  const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
  if (!account) {
    sendError(res, "NOT_FOUND", `Account ${accountId} not found`, undefined, 404);
    return;
  }
  if (account.platform !== "INSTAGRAM") {
    sendError(res, "BAD_REQUEST", "This endpoint only supports Instagram accounts", undefined, 400);
    return;
  }
  if (!account.tokenEncrypted) {
    sendError(res, "NOT_CONNECTED", "Account has no stored token — reconnect via OAuth", undefined, 422);
    return;
  }

  let accessToken: string;
  try {
    accessToken = decrypt(account.tokenEncrypted);
  } catch (err) {
    logger.warn({ accountId }, "Could not decrypt Instagram token");
    sendError(res, "TOKEN_ERROR", "Stored token could not be decrypted — reconnect via OAuth", undefined, 422);
    return;
  }

  try {
    const insights = await getIgInsights({ accessToken, igUserId: account.accountId });
    sendSuccess(res, { accountId: account.id, igUserId: account.accountId, accountName: account.accountName, ...insights });
  } catch (err) {
    logger.error({ accountId, err }, "Instagram insights fetch failed");
    sendError(res, "INSIGHTS_ERROR", err instanceof Error ? err.message : "Failed to fetch insights", undefined, 502);
  }
});

// ─── GET /api/insights/best-time ─────────────────────────────────────────────
// Aggregates SocialComment timestamps by platform → day-of-week + hour (UTC),
// returning a heatmap showing when your audience is most active.
// Looks back 90 days so the data stays relevant.
router.get("/best-time", async (_req: Request, res: Response) => {
  type RawRow = { platform: string; day: number; hour: number; count: bigint };
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      platform::text                      AS platform,
      EXTRACT(DOW  FROM timestamp)::int   AS day,
      EXTRACT(HOUR FROM timestamp)::int   AS hour,
      COUNT(*)::bigint                    AS count
    FROM "SocialComment"
    WHERE timestamp > NOW() - INTERVAL '90 days'
    GROUP BY platform, day, hour
    ORDER BY platform, day, hour
  `;

  type PlatformData = {
    heatmap: { day: number; hour: number; count: number }[];
    totalComments: number;
  };
  const result: Record<string, PlatformData> = {};
  for (const row of rows) {
    const p = row.platform;
    if (!result[p]) result[p] = { heatmap: [], totalComments: 0 };
    const count = Number(row.count);
    result[p].heatmap.push({ day: row.day, hour: row.hour, count });
    result[p].totalComments += count;
  }
  sendSuccess(res, result);
});

export default router;
