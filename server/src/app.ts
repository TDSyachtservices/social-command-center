import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import * as path from "path";
import { existsSync } from "fs";
import { logger } from "./utils/logger.js";
import { sendError } from "./utils/response.js";
import { AppError } from "./utils/errors.js";

import healthRouter from "./routes/health.routes.js";
import postsRouter from "./routes/posts.routes.js";
import mediaRouter from "./routes/media.routes.js";
import accountsRouter from "./routes/accounts.routes.js";
import schedulerRouter from "./routes/scheduler.routes.js";
import inboxRouter from "./routes/inbox.routes.js";
import logsRouter from "./routes/logs.routes.js";
import settingsRouter from "./routes/settings.routes.js";
import aiRouter from "./routes/ai.routes.js";
import authRouter from "./routes/auth.routes.js";
import insightsRouter from "./routes/insights.routes.js";
import webhookRouter from "./routes/webhook.routes.js";
import notificationsRouter from "./routes/notifications.routes.js";

const app = express();

// ─── BigInt serialization ─────────────────────────────────────────────────────
// Prisma maps BigInt columns (e.g. originalSizeBytes) to JS BigInt, which
// JSON.stringify cannot serialize by default. This replacer converts them to
// numbers so all routes work without per-handler casting.
app.set("json replacer", (_key: string, value: unknown) =>
  typeof value === "bigint" ? Number(value) : value,
);

// ─── CORS ────────────────────────────────────────────────────────────────────
// Explicit origins from env vars (comma-separated).
const configuredOrigins = [
  ...(process.env.FRONTEND_URL ?? "").split(","),
  ...(process.env.CORS_ORIGINS ?? "").split(","),
]
  .map((u) => u.trim())
  .filter(Boolean);

/** Return true for origins that are always safe to allow. */
function isAlwaysAllowed(origin: string): boolean {
  // Localhost (any port) — Replit dev preview proxies as localhost.
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  // Replit preview / published domains.
  if (origin.endsWith(".replit.dev")) return true;
  if (origin.endsWith(".repl.co")) return true;
  if (origin.endsWith(".replit.app")) return true;
  // Railway production domains. The single-image deploy serves the SPA and API
  // from the same Railway origin, but Vite marks the <script>/<link> asset tags
  // `crossorigin`, so the browser sends an Origin header even for these
  // same-origin asset requests. This origin MUST be allowed or the browser
  // cannot load the app's own JS/CSS and the page renders blank.
  if (origin.endsWith(".railway.app")) return true;
  return false;
}

app.use(
  cors({
    origin: (origin, cb) => {
      // No origin = same-origin or non-browser (curl, health checks) — allow.
      if (!origin) { cb(null, true); return; }
      // Always allow Replit preview domains and localhost.
      if (isAlwaysAllowed(origin)) { cb(null, true); return; }
      // Check explicitly configured origins.
      if (configuredOrigins.length > 0 && configuredOrigins.includes(origin)) {
        cb(null, true); return;
      }
      // In development allow everything; in production block unknown origins.
      if (process.env.NODE_ENV !== "production") { cb(null, true); return; }
      // Reject WITHOUT throwing. Passing an Error here makes the cors middleware
      // call next(err), which routes to the global handler and returns a 500 for
      // the ENTIRE response — including static JS/CSS assets — blanking the SPA.
      // cb(null, false) instead omits the CORS headers (the browser still
      // enforces the policy) while letting the request complete normally.
      logger.warn({ origin }, "CORS: origin not in allowlist; responding without CORS headers");
      cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Internal-Api-Key"],
  }),
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
// 50 MB to accommodate base64-encoded image uploads (~37 MB raw before encoding)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logging ─────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === "/api/health" },
  }),
);

// ─── Static uploads ──────────────────────────────────────────────────────────
// Serves files written by the media resize pipeline at /api/uploads/<assetId>/
app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/health", healthRouter);
app.use("/api/posts", postsRouter);
app.use("/api/media", mediaRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/scheduler", schedulerRouter);
app.use("/api/inbox", inboxRouter);
app.use("/api/logs", logsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/auth", authRouter);
app.use("/api/insights", insightsRouter);
app.use("/api/webhook", webhookRouter);
app.use("/api/notifications", notificationsRouter);

// ─── Privacy Policy (public, required by OAuth providers) ────────────────────
app.get("/privacy", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — Social Command Center</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 760px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; }
    h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }
    h2 { font-size: 1.15rem; font-weight: 600; margin-top: 2rem; }
    p, li { font-size: 0.975rem; color: #333; }
    ul { padding-left: 1.5rem; }
    a { color: #0A66C2; }
    .meta { color: #666; font-size: 0.875rem; margin-bottom: 2.5rem; }
    hr { border: none; border-top: 1px solid #e5e5e5; margin: 2.5rem 0; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p class="meta">Social Command Center &mdash; Last updated: July 6, 2026</p>

  <p>Social Command Center ("the App") is a private social media management tool. This policy explains what data is collected, how it is used, and how it is protected.</p>

  <h2>1. Data We Collect</h2>
  <ul>
    <li><strong>Social account credentials:</strong> OAuth access tokens for Facebook, Instagram, and LinkedIn pages you explicitly connect. Tokens are encrypted at rest.</li>
    <li><strong>Page and account metadata:</strong> Account names, IDs, and page insights (follower counts, reach, engagement) fetched from connected platforms.</li>
    <li><strong>Posts and media:</strong> Content you create or schedule through the App.</li>
    <li><strong>Usage data:</strong> Server logs (timestamps, HTTP status codes) for debugging. No analytics or tracking cookies are used.</li>
  </ul>

  <h2>2. How We Use Your Data</h2>
  <ul>
    <li>To publish posts, read comments, and retrieve insights on your behalf via the respective platform APIs.</li>
    <li>To display performance metrics on the KPI dashboard.</li>
    <li>We do not sell, share, or disclose your data to third parties beyond the platform APIs required to operate the App.</li>
  </ul>

  <h2>3. Third-Party Platforms</h2>
  <p>The App integrates with Meta (Facebook &amp; Instagram) and LinkedIn via their official APIs. Your use of those platforms is governed by their own privacy policies:</p>
  <ul>
    <li><a href="https://www.facebook.com/privacy/policy/" target="_blank">Meta Privacy Policy</a></li>
    <li><a href="https://www.linkedin.com/legal/privacy-policy" target="_blank">LinkedIn Privacy Policy</a></li>
  </ul>

  <h2>4. Data Retention</h2>
  <p>Access tokens are stored only as long as the account remains connected. Disconnecting an account removes the stored token from our database. Post records and insights are retained for historical reporting and can be deleted on request.</p>

  <h2>5. Security</h2>
  <p>All tokens are AES-256 encrypted before storage. The App is served over HTTPS. Database access is restricted to the application server.</p>

  <h2>6. Your Rights</h2>
  <p>You may disconnect any account at any time via the Connected Accounts page, which revokes the App's access and deletes the stored token. To request deletion of all stored data, contact the App administrator.</p>

  <h2>7. Contact</h2>
  <p>This is a private business tool. For questions about data handling, contact the account administrator directly.</p>

  <hr />
  <p style="font-size:0.8rem;color:#888;">&copy; ${new Date().getFullYear()} Social Command Center. All rights reserved.</p>
</body>
</html>`);
});

// ─── Static frontend (single-domain production deploy) ──────────────────────
// In the combined Railway image the built React app is copied to /app/public,
// so one domain serves both the API (/api/*) and the SPA. Guarded by existsSync
// so local dev and tests (where no build is present) fall straight through to
// the JSON 404 below and are completely unaffected.
const publicDir = path.join(process.cwd(), "public");
const indexHtml = path.join(publicDir, "index.html");

if (existsSync(indexHtml)) {
  app.use(
    express.static(publicDir, {
      index: false,
      setHeaders: (res, filePath) => {
        // Vite emits content-hashed filenames under /assets — cache forever.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  // SPA fallback: any non-API GET/HEAD that didn't match a static file returns
  // index.html so client-side routing (wouter) can take over. Non-GET and /api
  // requests fall through to the JSON 404 handler below.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      !req.path.startsWith("/api")
    ) {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(indexHtml);
      return;
    }
    next();
  });
}

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  sendError(res, "NOT_FOUND", "Route not found", undefined, 404);
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.details, err.statusCode);
    return;
  }
  logger.error(err, "Unhandled error");
  sendError(res, "INTERNAL_ERROR", "An unexpected error occurred", undefined, 500);
});

export default app;
