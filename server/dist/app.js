"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pino_http_1 = __importDefault(require("pino-http"));
const path = __importStar(require("path"));
const logger_js_1 = require("./utils/logger.js");
const response_js_1 = require("./utils/response.js");
const errors_js_1 = require("./utils/errors.js");
const health_routes_js_1 = __importDefault(require("./routes/health.routes.js"));
const posts_routes_js_1 = __importDefault(require("./routes/posts.routes.js"));
const media_routes_js_1 = __importDefault(require("./routes/media.routes.js"));
const accounts_routes_js_1 = __importDefault(require("./routes/accounts.routes.js"));
const scheduler_routes_js_1 = __importDefault(require("./routes/scheduler.routes.js"));
const inbox_routes_js_1 = __importDefault(require("./routes/inbox.routes.js"));
const logs_routes_js_1 = __importDefault(require("./routes/logs.routes.js"));
const settings_routes_js_1 = __importDefault(require("./routes/settings.routes.js"));
const ai_routes_js_1 = __importDefault(require("./routes/ai.routes.js"));
const website_routes_js_1 = __importDefault(require("./routes/website.routes.js"));
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const insights_routes_js_1 = __importDefault(require("./routes/insights.routes.js"));
const app = (0, express_1.default)();
// ─── BigInt serialization ─────────────────────────────────────────────────────
// Prisma maps BigInt columns (e.g. originalSizeBytes) to JS BigInt, which
// JSON.stringify cannot serialize by default. This replacer converts them to
// numbers so all routes work without per-handler casting.
app.set("json replacer", (_key, value) => typeof value === "bigint" ? Number(value) : value);
// ─── CORS ────────────────────────────────────────────────────────────────────
// Explicit origins from env vars (comma-separated).
const configuredOrigins = [
    ...(process.env.FRONTEND_URL ?? "").split(","),
    ...(process.env.CORS_ORIGINS ?? "").split(","),
]
    .map((u) => u.trim())
    .filter(Boolean);
/** Return true for origins that are always safe to allow. */
function isAlwaysAllowed(origin) {
    // Localhost (any port) — Replit dev preview proxies as localhost.
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin))
        return true;
    // Replit preview / published domains.
    if (origin.endsWith(".replit.dev"))
        return true;
    if (origin.endsWith(".repl.co"))
        return true;
    if (origin.endsWith(".replit.app"))
        return true;
    return false;
}
app.use((0, cors_1.default)({
    origin: (origin, cb) => {
        // No origin = same-origin or non-browser (curl, health checks) — allow.
        if (!origin) {
            cb(null, true);
            return;
        }
        // Always allow Replit preview domains and localhost.
        if (isAlwaysAllowed(origin)) {
            cb(null, true);
            return;
        }
        // Check explicitly configured origins.
        if (configuredOrigins.length > 0 && configuredOrigins.includes(origin)) {
            cb(null, true);
            return;
        }
        // In development allow everything; in production block unknown origins.
        if (process.env.NODE_ENV !== "production") {
            cb(null, true);
            return;
        }
        cb(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Internal-Api-Key"],
}));
// ─── Body parsing ─────────────────────────────────────────────────────────────
// 50 MB to accommodate base64-encoded image uploads (~37 MB raw before encoding)
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Request logging ─────────────────────────────────────────────────────────
app.use((0, pino_http_1.default)({
    logger: logger_js_1.logger,
    autoLogging: { ignore: (req) => req.url === "/api/health" },
}));
// ─── Static uploads ──────────────────────────────────────────────────────────
// Serves files written by the media resize pipeline at /api/uploads/<assetId>/
app.use("/api/uploads", express_1.default.static(path.join(process.cwd(), "uploads")));
// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/health", health_routes_js_1.default);
app.use("/api/posts", posts_routes_js_1.default);
app.use("/api/media", media_routes_js_1.default);
app.use("/api/accounts", accounts_routes_js_1.default);
app.use("/api/scheduler", scheduler_routes_js_1.default);
app.use("/api/inbox", inbox_routes_js_1.default);
app.use("/api/logs", logs_routes_js_1.default);
app.use("/api/settings", settings_routes_js_1.default);
app.use("/api/ai", ai_routes_js_1.default);
app.use("/api/website", website_routes_js_1.default);
app.use("/api/auth", auth_routes_js_1.default);
app.use("/api/insights", insights_routes_js_1.default);
// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    (0, response_js_1.sendError)(res, "NOT_FOUND", "Route not found", undefined, 404);
});
// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    if (err instanceof errors_js_1.AppError) {
        (0, response_js_1.sendError)(res, err.code, err.message, err.details, err.statusCode);
        return;
    }
    logger_js_1.logger.error(err, "Unhandled error");
    (0, response_js_1.sendError)(res, "INTERNAL_ERROR", "An unexpected error occurred", undefined, 500);
});
exports.default = app;
//# sourceMappingURL=app.js.map