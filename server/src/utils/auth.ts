import { Request, Response, NextFunction } from "express";
import { sendError } from "./response.js";

export function requireInternalApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const key = req.headers["x-internal-api-key"];
  const expected = process.env.INTERNAL_API_KEY;

  if (!expected) {
    sendError(res, "MISCONFIGURED", "INTERNAL_API_KEY is not set", undefined, 500);
    return;
  }

  if (!key || key !== expected) {
    sendError(res, "UNAUTHORIZED", "Invalid or missing internal API key", undefined, 401);
    return;
  }

  next();
}
