// server/src/routes/audit.ts
import { Router, Request, RequestHandler, Response } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { queryAuditLogs } from '../services/audit.service';

/**
 * GET /api/audit?limit=100&targetCollection=students
 * Who changed what and when. super_admin only.
 */
const router = Router();

const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

router.use(verifyToken, requireRole('super_admin'));

router.get(
  '/',
  ah(async (req, res) => {
    const limit = Math.min(300, Math.max(1, Number(req.query.limit) || 100));
    const targetCollection =
      typeof req.query.targetCollection === 'string' && req.query.targetCollection
        ? req.query.targetCollection
        : undefined;

    const rows = await queryAuditLogs({ targetCollection, limit });
    const items = rows.map((r) => {
      const at = r.at as { toDate?: () => Date } | undefined;
      return {
        id: String(r.id ?? ''),
        action: String(r.action ?? ''),
        actorEmail: String(r.actorEmail ?? ''),
        actorUid: String(r.actorUid ?? ''),
        targetCollection: String(r.targetCollection ?? ''),
        targetId: String(r.targetId ?? ''),
        at: at?.toDate ? at.toDate().toISOString() : null,
      };
    });
    res.json({ items });
  }),
);

export default router;
