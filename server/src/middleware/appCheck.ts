// server/src/middleware/appCheck.ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getAppCheck } from 'firebase-admin/app-check';
import '../config/firebase'; // side effect: initializes the default Admin app

/**
 * Firebase App Check verification for public POST endpoints.
 *
 * - RECAPTCHA_ENFORCE_APP_CHECK !== 'true' → pass-through (nothing is checked).
 * - RECAPTCHA_ENFORCE_APP_CHECK === 'true' → a valid `X-Firebase-AppCheck`
 *   token is required, otherwise 401 with a generic bilingual error.
 *
 * Mount once in index.ts, before the routers:
 *   app.post(APP_CHECK_PROTECTED_PATHS, verifyAppCheck);
 * (CORS `allowedHeaders` must include "X-Firebase-AppCheck".)
 */

export const APP_CHECK_HEADER = 'X-Firebase-AppCheck';

export const APP_CHECK_PROTECTED_PATHS: string[] = [
  '/api/admission/apply',
  '/api/admission/status',
  '/api/contact',
  '/api/payments/submit',
  '/api/results/lookup',
];

const REJECT_MESSAGE = 'অ্যাপ যাচাই ব্যর্থ হয়েছে / App verification failed';

function isEnforced(): boolean {
  return (process.env.RECAPTCHA_ENFORCE_APP_CHECK ?? '').trim().toLowerCase() === 'true';
}

function reject(res: Response): void {
  res.status(401).json({ error: REJECT_MESSAGE });
}

export const verifyAppCheck: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!isEnforced()) {
    next();
    return;
  }

  const token = req.header(APP_CHECK_HEADER);
  if (!token) {
    reject(res);
    return;
  }

  getAppCheck()
    .verifyToken(token)
    .then(() => {
      res.locals.appCheckVerified = true;
      next();
    })
    .catch((err: unknown) => {
      // Never log the token itself.
      const code = (err as { code?: string } | null)?.code ?? 'unknown';
      console.warn('[appCheck] rejected', { path: req.path, code });
      reject(res);
    });
};
