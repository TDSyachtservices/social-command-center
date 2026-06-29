"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_js_1 = require("../db/prisma.js");
const response_js_1 = require("../utils/response.js");
const crypto_js_1 = require("../utils/crypto.js");
const facebook_js_1 = require("../adapters/facebook.js");
const logger_js_1 = require("../utils/logger.js");
const router = (0, express_1.Router)();
// ─── GET /api/insights/facebook/:accountId ──────────────────────────────────
// Returns Page Insights for the given Facebook account.
// Requires the page token to have been granted the read_insights permission.
router.get("/facebook/:accountId", async (req, res) => {
    const { accountId } = req.params;
    const account = await prisma_js_1.prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account) {
        (0, response_js_1.sendError)(res, "NOT_FOUND", `Account ${accountId} not found`, undefined, 404);
        return;
    }
    if (account.platform !== "FACEBOOK") {
        (0, response_js_1.sendError)(res, "BAD_REQUEST", "This endpoint only supports Facebook accounts", undefined, 400);
        return;
    }
    if (!account.tokenEncrypted) {
        (0, response_js_1.sendError)(res, "NOT_CONNECTED", "Account has no stored token — reconnect via OAuth", undefined, 422);
        return;
    }
    let accessToken;
    try {
        accessToken = (0, crypto_js_1.decrypt)(account.tokenEncrypted);
    }
    catch (err) {
        logger_js_1.logger.warn({ accountId }, "Could not decrypt Facebook token");
        (0, response_js_1.sendError)(res, "TOKEN_ERROR", "Stored token could not be decrypted — reconnect via OAuth", undefined, 422);
        return;
    }
    try {
        const insights = await (0, facebook_js_1.getPageInsights)({ accessToken, pageId: account.accountId });
        (0, response_js_1.sendSuccess)(res, { accountId: account.id, pageId: account.accountId, accountName: account.accountName, ...insights });
    }
    catch (err) {
        logger_js_1.logger.error({ accountId, err }, "Facebook insights fetch failed");
        (0, response_js_1.sendError)(res, "INSIGHTS_ERROR", err instanceof Error ? err.message : "Failed to fetch insights", undefined, 502);
    }
});
exports.default = router;
//# sourceMappingURL=insights.routes.js.map