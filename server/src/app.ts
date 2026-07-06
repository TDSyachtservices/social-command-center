import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import * as path from "path";
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
      cb(new Error(`CORS: origin '${origin}' not allowed`));
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
