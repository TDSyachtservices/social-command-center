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

export default router;
