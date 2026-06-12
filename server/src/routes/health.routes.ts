import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, { status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    sendError(res, "DB_ERROR", "Database connection failed", undefined, 503);
  }
});

export default router;
