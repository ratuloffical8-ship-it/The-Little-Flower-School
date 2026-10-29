// server/src/routes/health.ts
import { Router, Request, RequestHandler, Response } from 'express';
import { db } from '../config/firebase';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

const DEEP_TIMEOUT_MS = 3000;

const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

function noStore(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
}

// Liveness only: no Firestore, no secrets. Used by Render's health check.
router.get('/', (_req, res) => {
  noStore(res);
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});

// Readiness: one cheap Firestore read. Rate-limited because it costs a read.
// Failure details are never returned to the caller.
router.get(
  '/deep',
  rateLimit({ windowMs: 60_000, max: 10 }),
  ah(async (_req, res) => {
    noStore(res);
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        db.collection('schoolSettings').doc('main').get(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), DEEP_TIMEOUT_MS);
        }),
      ]);
      res.json({ status: 'ok', checks: { firestore: 'ok' } });
    } catch {
      res.status(503).json({ status: 'degraded', checks: { firestore: 'unavailable' } });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }),
);

export default router;
