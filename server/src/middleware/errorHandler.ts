// server/src/middleware/errorHandler.ts
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/errors';

/**
 * Central error handling. Replaces the inline global error handler in index.ts:
 *   app.use('/api', notFoundHandler);   // after all routers
 *   app.use(errorHandler);              // last
 *
 * Response shape is always `{ error: string }` (bilingual message), plus
 * `details` for validation errors. 5xx messages are never leaked in production.
 */

const MSG = {
  server: 'সার্ভারে সমস্যা হয়েছে / Something went wrong',
  notFound: 'পাওয়া যায়নি / Not found',
  invalid: 'তথ্য সঠিক নয় / Invalid input',
  badJson: 'অবৈধ অনুরোধ / Invalid JSON body',
  tooLarge: 'অনুরোধ অনেক বড় / Request too large',
  fileTooLarge: 'ফাইল অনেক বড় (সর্বোচ্চ ৩ MB) / File too large (max 3 MB)',
  badUpload: 'ফাইল আপলোড ব্যর্থ হয়েছে / Invalid file upload',
  cors: 'অনুমতি নেই / Origin not allowed',
} as const;

interface Classified {
  status: number;
  message: string;
  details?: Array<{ path: string; message: string }>;
}

function clampStatus(n: unknown): number | null {
  return typeof n === 'number' && Number.isInteger(n) && n >= 400 && n <= 599 ? n : null;
}

function classify(err: unknown): Classified {
  if (err instanceof ZodError) {
    return {
      status: 400,
      message: MSG.invalid,
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    };
  }

  if (err instanceof HttpError) {
    const e = err as unknown as { statusCode?: number; status?: number };
    return { status: clampStatus(e.statusCode) ?? clampStatus(e.status) ?? 500, message: err.message };
  }

  const e = (err ?? {}) as {
    name?: string;
    code?: string;
    type?: string;
    status?: number;
    statusCode?: number;
    expose?: boolean;
    message?: string;
  };

  // body-parser
  if (e.type === 'entity.parse.failed') return { status: 400, message: MSG.badJson };
  if (e.type === 'entity.too.large') return { status: 413, message: MSG.tooLarge };

  // multer
  if (e.name === 'MulterError') {
    return e.code === 'LIMIT_FILE_SIZE'
      ? { status: 413, message: MSG.fileTooLarge }
      : { status: 400, message: MSG.badUpload };
  }

  // cors origin callback rejection
  if (typeof e.message === 'string' && /cors/i.test(e.message)) {
    return { status: 403, message: MSG.cors };
  }

  // http-errors style (4xx with expose=true)
  const status = clampStatus(e.statusCode) ?? clampStatus(e.status);
  if (status && status < 500 && e.expose === true && e.message) {
    return { status, message: e.message };
  }

  return { status: 500, message: MSG.server };
}

export const notFoundHandler: RequestHandler = (_req: Request, res: Response) => {
  res.status(404).json({ error: MSG.notFound });
};

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const { status, message, details } = classify(err);

  if (status >= 500) {
    // Log server faults only; never log request bodies, headers or tokens.
    console.error('[error]', {
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status,
      message: err instanceof Error ? err.message : String(err),
      stack: process.env.NODE_ENV === 'production' ? undefined : err instanceof Error ? err.stack : undefined,
    });
  }

  const body: { error: string; details?: Classified['details']; debug?: string } = { error: message };
  if (details) body.details = details;
  if (status >= 500 && process.env.NODE_ENV !== 'production' && err instanceof Error) {
    body.debug = err.message;
  }

  res.status(status).json(body);
};
