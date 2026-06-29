import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { encrypt } from "../utils/crypto.js";
import { logger } from "../utils/logger.js";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getPages,
  getGrantedPermissions,
  getInstagramAccountForPage,
} from "../adapters/facebook.js";

const router = Router();

const FB_SCOPES = [
  "pages_manage_posts",
  "pages_manage_engagement",
  "pages_read_engagement",
  "pages_read_user_content",
  "pages_show_list",
  "read_insights",
  "instagram_basic",
  "instagram_manage_comments",
  "instagram_content_publish",
  "instagram_manage_insights",
].join(",");

function getRedirectUri(): string {
  const base = (process.env.API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
  return `${base}/api/auth/facebook/callback`;
}

function getFrontendUrl(): string {
  return (process.env.FRONTEND_URL ?? "http://localhost:5173").split(",")[0].trim();
}

function buildOAuthUrl(clientId: string, redirectUri: string): string {
  const url = new URL("https://www.facebook.com/dialog/oauth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", FB_SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

// ─── GET /api/auth/facebook ────────────────────────────────────────────────────
// Redirects the user's browser to the Facebook login + permissions dialog.
router.get("/facebook", (_req: Request, res: Response) => {
  const clientId = process.env.META_CLIENT_ID;
  if (!clientId) {
    res.status(500).send(
      "<h2>Configuration error</h2><p>META_CLIENT_ID is not set on this server. " +
      "Add it to your Railway environment variables and redeploy.</p>",
    );
    return;
  }
  logger.info({ redirectUri: getRedirectUri() }, "Redirecting to Facebook OAuth");
  res.redirect(buildOAuthUrl(clientId, getRedirectUri()));
});

// ─── GET /api/auth/instagram ───────────────────────────────────────────────────
// Instagram Business accounts are discovered via the Facebook OAuth flow.
// This route starts the same OAuth but the callback also upserts linked IG accounts.
router.get("/instagram", (_req: Request, res: Response) => {
  const clientId = process.env.META_CLIENT_ID;
  if (!clientId) {
    res.status(500).send(
      "<h2>Configuration error</h2><p>META_CLIENT_ID is not set on this server.</p>",
    );
    return;
  }
  logger.info({ redirectUri: getRedirectUri() }, "Redirecting to Instagram OAuth (via Facebook)");
  res.redirect(buildOAuthUrl(clientId, getRedirectUri()));
});

// ─── GET /api/auth/facebook/callback ──────────────────────────────────────────
// Facebook sends the user back here after they approve (or deny) the app.
router.get("/facebook/callback", async (req: Request, res: Response) => {
  const frontendUrl = getFrontendUrl();
  const { code, error, error_description } = req.query as {
    code?: string;
    error?: string;
    error_description?: string;
  };

  if (error || !code) {
    logger.warn({ error, error_description }, "Facebook OAuth denied");
    res.redirect(`${frontendUrl}/connected-accounts?error=facebook_denied`);
    return;
  }

  try {
    const redirectUri = getRedirectUri();

    // Step 1: exchange authorization code → short-lived user token
    const shortToken = await exchangeCodeForToken(code, redirectUri);

    // Step 2: upgrade to 60-day long-lived user token
    const { token: longToken, expiresIn } = await getLongLivedToken(shortToken);

    // Step 2b: fetch the permissions Facebook actually GRANTED (not just what we asked for).
    // The user can deselect permissions on the consent screen, so this is the source of truth.
    const grantedScopes = await getGrantedPermissions(longToken);
    const canPost = grantedScopes.includes("pages_manage_posts");
    const canReplyComments = grantedScopes.includes("pages_manage_engagement");
    const canReadComments =
      grantedScopes.includes("pages_read_user_content") ||
      grantedScopes.includes("pages_read_engagement");
    logger.info({ grantedScopes, canPost, canReadComments }, "Facebook granted permissions");

    // Step 3: list all Facebook Pages this user manages
    const pages = await getPages(longToken);

    if (pages.length === 0) {
      logger.warn("Facebook OAuth: user has no managed pages");
      res.redirect(`${frontendUrl}/connected-accounts?error=no_pages`);
      return;
    }

    // Instagram capabilities depend on which scopes were granted
    const canIgRead = grantedScopes.includes("instagram_basic");
    const canIgComment = grantedScopes.includes("instagram_manage_comments");
    const canIgPublish = grantedScopes.includes("instagram_content_publish");

    // Step 4: upsert each Page as a SocialAccount, then discover linked Instagram accounts
    let fbCount = 0;
    let igCount = 0;

    for (const page of pages) {
      const encryptedToken = encrypt(page.access_token);
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // ── Facebook Page ──
      const existingFb = await prisma.socialAccount.findFirst({
        where: { platform: "FACEBOOK", accountId: page.id },
      });

      if (existingFb) {
        await prisma.socialAccount.update({
          where: { id: existingFb.id },
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
        logger.info({ pageId: page.id, name: page.name }, "Facebook page token refreshed");
      } else {
        await prisma.socialAccount.create({
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
        logger.info({ pageId: page.id, name: page.name, canPost }, "Facebook page connected");
      }
      fbCount++;

      // ── Instagram Business Account linked to this Page ──
      if (canIgRead) {
        try {
          const igAccount = await getInstagramAccountForPage(page.id, page.access_token);
          if (igAccount) {
            const existingIg = await prisma.socialAccount.findFirst({
              where: { platform: "INSTAGRAM", accountId: igAccount.id },
            });

            const igData = {
              accountName: igAccount.username ? `@${igAccount.username}` : igAccount.name,
              connectionStatus: "connected",
              tokenEncrypted: encryptedToken,   // page token is used for IG API calls
              tokenExpiresAt: expiresAt,
              postingCapability: canIgPublish,
              commentReadCapability: canIgComment,
              commentReplyCapability: canIgComment,
              moderationCapability: false,
              lastSync: new Date(),
              scopes: grantedScopes,
              metadata: {
                igUsername: igAccount.username ?? null,
                linkedFbPageId: page.id,
                linkedFbPageName: page.name,
              },
            };

            if (existingIg) {
              await prisma.socialAccount.update({ where: { id: existingIg.id }, data: igData });
              logger.info({ igId: igAccount.id, name: igAccount.name }, "Instagram account refreshed");
            } else {
              await prisma.socialAccount.create({
                data: { platform: "INSTAGRAM", accountId: igAccount.id, ...igData },
              });
              logger.info({ igId: igAccount.id, name: igAccount.name }, "Instagram account connected");
            }
            igCount++;
          } else {
            logger.info({ pageId: page.id }, "No Instagram Business Account linked to this page");
          }
        } catch (igErr) {
          logger.warn({ pageId: page.id, igErr }, "Could not fetch Instagram account for page — skipping");
        }
      }
    }

    logger.info({ fbPages: fbCount, igAccounts: igCount }, "OAuth complete");
    res.redirect(
      `${frontendUrl}/connected-accounts?connected=facebook&pages=${fbCount}&instagram=${igCount}`,
    );
  } catch (err) {
    logger.error(err, "Facebook OAuth callback error");
    res.redirect(`${frontendUrl}/connected-accounts?error=facebook_failed`);
  }
});

export default router;
