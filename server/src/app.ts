import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
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
import websiteRouter from "./routes/website.routes.js";

const app = express();

// ─── BigInt serialization ─────────────────────────────────────────────────────
// Prisma maps BigInt columns (e.g. originalSizeBytes) to JS BigInt, which
// JSON.stringify cannot serialize by default. This replacer converts them to
// numbers so all routes work without per-handler casting.
app.set("json replacer", (_key: string, value: unknown) =>
  typeof value === "bigint" ? Number(value) : value,
);

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      if (allowedOrigins.length === 0) {
        if (process.env.NODE_ENV === "production") {
          cb(new Error("CORS: FRONTEND_URL is not set in production"));
        } else {
          cb(null, true);
        }
        return;
      }
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Internal-Api-Key"],
  }),
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logging ─────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === "/api/health" },
  }),
);

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
app.use("/api/website", websiteRouter);

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
