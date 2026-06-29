import { Response } from "express";

export interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  meta?: ApiMeta,
  status = 200,
): void {
  const body: SuccessEnvelope<T> = { success: true, data };
  if (meta) body.meta = meta;
  res.status(status).json(body);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  details?: unknown,
  status = 400,
): void {
  const body: ErrorEnvelope = {
    success: false,
    error: { code, message },
  };
  if (details !== undefined) body.error.details = details;
  res.status(status).json(body);
}
