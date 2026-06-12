export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ErrorCodes = {
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  RATE_LIMITED: "RATE_LIMITED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export function notFound(resource: string, id?: string): AppError {
  const msg = id ? `${resource} '${id}' not found` : `${resource} not found`;
  return new AppError(ErrorCodes.NOT_FOUND, msg, 404);
}

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(ErrorCodes.BAD_REQUEST, message, 400, details);
}

export function unauthorized(message = "Unauthorized"): AppError {
  return new AppError(ErrorCodes.UNAUTHORIZED, message, 401);
}

export function forbidden(message = "Forbidden"): AppError {
  return new AppError(ErrorCodes.FORBIDDEN, message, 403);
}
