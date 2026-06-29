"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_js_1 = require("./db/prisma.js");
const logger_js_1 = require("./utils/logger.js");
const app_js_1 = __importDefault(require("./app.js"));
const cron_js_1 = require("./scheduler/cron.js");
const PORT = parseInt(process.env.PORT ?? "3001", 10);
async function main() {
    await (0, prisma_js_1.connectDb)();
    (0, cron_js_1.startScheduler)();
    const server = app_js_1.default.listen(PORT, () => {
        logger_js_1.logger.info({ port: PORT, env: process.env.NODE_ENV }, "Server started");
    });
    const shutdown = async (signal) => {
        logger_js_1.logger.info({ signal }, "Shutdown signal received");
        (0, cron_js_1.stopScheduler)();
        server.close(async () => {
            await (0, prisma_js_1.disconnectDb)();
            process.exit(0);
        });
    };
    process.once("SIGTERM", (sig) => shutdown(sig));
    process.once("SIGINT", (sig) => shutdown(sig));
}
main().catch((err) => {
    logger_js_1.logger.error(err, "Startup error");
    process.exit(1);
});
//# sourceMappingURL=index.js.map