"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_js_1 = require("../db/prisma.js");
const response_js_1 = require("../utils/response.js");
const router = (0, express_1.Router)();
const BUILD_TIME = new Date().toISOString();
// Returns the spec-required direct format { status, db } without the success envelope.
router.get("/", async (_req, res) => {
    try {
        await prisma_js_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: "ok", db: "connected", build: BUILD_TIME, routes: ["insights", "auth/instagram"] });
    }
    catch {
        (0, response_js_1.sendError)(res, "DB_ERROR", "Database connection failed", undefined, 503);
    }
});
exports.default = router;
//# sourceMappingURL=health.routes.js.map