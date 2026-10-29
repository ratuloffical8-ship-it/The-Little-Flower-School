// server/src/routes/public.ts
import { Router } from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { rateLimit } from '../middleware/rateLimit';
import { getPublicSettings } from '../services/settings.service';

/**
 * Public, unauthenticated endpoints.
 *
 * Mounted on the SAME prefix as the admin settings router, and BEFORE it:
 *   app.use('/api/settings', publicRoutes);    // handles only GET /public, otherwise falls through
 *   app.use('/api/settings', settingsRoutes);  // admin router (verifyToken on every path)
 */
const router = Router();

const ah =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

// GET /api/settings/public → { item }  (school name, address, bKash/Nagad numbers, etc.)
router.get(
  '/public',
  rateLimit({ windowMs: 60_000, max: 60 }),
  ah(async (_req, res) => {
    const item = await getPublicSettings();
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ item });
  }),
);

export default router;
