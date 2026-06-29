import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { sendError } from "../utils/response.js";

const router = Router();

const BUILD_TIME = new Date().toISOString();

// Returns the spec-required direct format { status, db } without the success envelope.
router.get("/", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected", build: BUILD_TIME, routes: ["insights", "auth/instagram"] });
  } catch {
    sendError(res, "DB_ERROR", "Database connection failed", undefined, 503);
  }
});

export default router;
