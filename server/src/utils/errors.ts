// server/src/utils/errors.ts

/**
 * Custom HTTP error class. Thrown from route handlers and caught
 * by the global error handler in index.ts.
 *
 * Usage:
 *   throw new HttpError(404, 'Student not found');
 *   throw notFound('Application');
 */
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

// ── Convenience factories ───────────────────────────────────────────
export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = 'Unauthorized') => new HttpError(401, message);
export const forbidden = (message = 'Insufficient permissions') => new HttpError(403, message);
export const notFound = (resource: string) => new HttpError(404, `${resource} not found`);
export const conflict = (message: string) => new HttpError(409, message);
export const tooMany = (message = 'Too many requests') => new HttpError(429, message);
