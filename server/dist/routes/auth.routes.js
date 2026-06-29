"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_js_1 = require("../db/prisma.js");
const crypto_js_1 = require("../utils/crypto.js");
const logger_js_1 = require("../utils/logger.js");
const facebook_js_1 = require("../adapters/facebook.js");
const router = (0, express_1.Router)();
const FB_SCOPES = ["pages_manage_posts", "pages_manage_engagement", "pages_read_engagement", "pages_read_user_content", "pages_show_list", "read_insights"].join(",");
function getRedirectUri() {
    const base = (process.env.API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
    return `${base}/api/auth/facebook/callback`;
}
function getFrontendUrl() {
    return (process.env.FRONTEND_URL ?? "http://localhost:5173").split(",")[0].trim();
}
// ─── GET /api/auth/facebook ────────────────────────────────────────────────────
// Redirects the user's browser to the Facebook login + permissions dialog.
router.get("/facebook", (_req, res) => {
    const clientId = process.env.META_CLIENT_ID;
    if (!clientId) {
        res.status(500).send("<h2>Configuration error</h2><p>META_CLIENT_ID is not set on this server. " +
            "Add it to your Railway environment variables and redeploy.</p>");
        return;
    }
    const url = new URL("https://www.facebook.com/dialog/oauth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", getRedirectUri());
    url.searchParams.set("scope", FB_SCOPES);
    url.searchParams.set("response_type", "code");
    logger_js_1.logger.info({ redirectUri: getRedirectUri() }, "Redirecting to Facebook OAuth");
    res.redirect(url.toString());
});
// ─── GET /api/auth/facebook/callback ──────────────────────────────────────────
// Facebook sends the user back here after they approve (or deny) the app.
router.get("/facebook/callback", async (req, res) => {
    const frontendUrl = getFrontendUrl();
    const { code, error, error_description } = req.query;
    if (error || !code) {
        logger_js_1.logger.warn({ error, error_description }, "Facebook OAuth denied");
        res.redirect(`${frontendUrl}/connected-accounts?error=facebook_denied`);
        return;
    }
    try {
        const redirectUri = getRedirectUri();
        // Step 1: exchange authorization code → short-lived user token
        const shortToken = await (0, facebook_js_1.exchangeCodeForToken)(code, redirectUri);
        // Step 2: upgrade to 60-day long-lived user token
        const { token: longToken, expiresIn } = await (0, facebook_js_1.getLongLivedToken)(shortToken);
        // Step 2b: fetch the permissions Facebook actually GRANTED (not just what we asked for).
        // The user can deselect permissions on the consent screen, so this is the source of truth.
        const grantedScopes = await (0, facebook_js_1.getGrantedPermissions)(longToken);
        const canPost = grantedScopes.includes("pages_manage_posts");
        const canReplyComments = grantedScopes.includes("pages_manage_engagement");
        const canReadComments = grantedScopes.includes("pages_read_user_content") ||
            grantedScopes.includes("pages_read_engagement");
        logger_js_1.logger.info({ grantedScopes, canPost, canReadComments }, "Facebook granted permissions");
        // Step 3: list all Facebook Pages this user manages
        const pages = await (0, facebook_js_1.getPages)(longToken);
        if (pages.length === 0) {
            logger_js_1.logger.warn("Facebook OAuth: user has no managed pages");
            res.redirect(`${frontendUrl}/connected-accounts?error=no_pages`);
            return;
        }
        // Step 4: upsert each Page as a SocialAccount
        let connectedCount = 0;
        for (const page of pages) {
            const encryptedToken = (0, crypto_js_1.encrypt)(page.access_token);
            const expiresAt = new Date(Date.now() + expiresIn * 1000);
            const existing = await prisma_js_1.prisma.socialAccount.findFirst({
                where: { platform: "FACEBOOK", accountId: page.id },
            });
            if (existing) {
                await prisma_js_1.prisma.socialAccount.update({
                    where: { id: existing.id },
                    data: {
                        accountName: page.name,
                        connectionStatus: "connected",
                        tokenEncrypted: encryptedToken,
                        tokenExpiresAt: expiresAt,
                        postingCapability: canPost,
                        commentReadCapability: canReadComments,
                        commentReplyCapability: canReplyComments,
                        moderationCapability: canPost,
                        lastSync: new Date(),
                        scopes: grantedScopes,
                        metadata: { category: page.category },
                    },
                });
                logger_js_1.logger.info({ pageId: page.id, name: page.name, canPost, canReplyComments }, "Facebook page token refreshed");
            }
            else {
                await prisma_js_1.prisma.socialAccount.create({
                    data: {
                        platform: "FACEBOOK",
                        accountId: page.id,
                        accountName: page.name,
                        connectionStatus: "connected",
                        tokenEncrypted: encryptedToken,
                        tokenExpiresAt: expiresAt,
                        postingCapability: canPost,
                        commentReadCapability: canReadComments,
                        commentReplyCapability: canReplyComments,
                        moderationCapability: canPost,
                        lastSync: new Date(),
                        scopes: grantedScopes,
                        metadata: { category: page.category },
                    },
                });
                logger_js_1.logger.info({ pageId: page.id, name: page.name, canPost }, "Facebook page connected");
            }
            connectedCount++;
        }
        logger_js_1.logger.info({ pages: pages.length }, "Facebook OAuth complete");
        res.redirect(`${frontendUrl}/connected-accounts?connected=facebook&pages=${connectedCount}`);
    }
    catch (err) {
        logger_js_1.logger.error(err, "Facebook OAuth callback error");
        res.redirect(`${frontendUrl}/connected-accounts?error=facebook_failed`);
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map