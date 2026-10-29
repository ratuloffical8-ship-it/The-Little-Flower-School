// server/src/routes/faq.ts
import { Router } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  listPublishedFAQ,
  listAllFAQ,
  getFAQById,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  reorderFAQ,
} from '../services/faq.service';
import { logAudit } from '../services/audit.service';

const router = Router();

// ════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════

const createFAQSchema = z.object({
  questionBn: z.string().trim().min(3).max(500),
  questionEn: z.string().trim().min(3).max(500),
  answerBn: z.string().trim().min(3).max(5000),
  answerEn: z.string().trim().min(3).max(5000),
  published: z.coerce.boolean().default(true),
  order: z.coerce.number().int().default(0),
});

const updateFAQSchema = createFAQSchema.partial();

const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        order: z.number().int(),
      })
    )
    .min(1)
    .max(100),
});

// ════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/faq/published
 * Returns all published FAQs, ordered.
 * NOTE: Frontend expects a raw array (not { items: [...] }).
 */
router.get('/published', async (_req, res, next) => {
  try {
    const items = await listPublishedFAQ();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/faq
 * Admin — list all FAQs (published + unpublished).
 */
router.get(
  '/',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  async (_req, res, next) => {
    try {
      const items = await listAllFAQ();
      res.json({ items });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/faq/:id
 * Admin — get single FAQ.
 */
router.get(
  '/:id',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  async (req, res, next) => {
    try {
      const faq = await getFAQById(req.params.id);
      if (!faq) {
        res.status(404).json({ error: 'FAQ not found' });
        return;
      }
      res.json(faq);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/faq
 * Admin — create.
 */
router.post(
  '/',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  validate(createFAQSchema),
  async (req, res, next) => {
    try {
      const id = await createFAQ(req.body);

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: 'faq.create',
        targetCollection: 'faq',
        targetId: id,
        details: { questionBn: req.body.questionBn },
      });

      res.status(201).json({ id });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/faq/:id
 * Admin — update.
 */
router.put(
  '/:id',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  validate(updateFAQSchema),
  async (req, res, next) => {
    try {
      await updateFAQ(req.params.id, req.body);

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: 'faq.update',
        targetCollection: 'faq',
        targetId: req.params.id,
        details: { changes: Object.keys(req.body) },
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/faq/:id
 * Admin — delete.
 */
router.delete(
  '/:id',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  async (req, res, next) => {
    try {
      await deleteFAQ(req.params.id);

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: 'faq.delete',
        targetCollection: 'faq',
        targetId: req.params.id,
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/faq/reorder
 * Admin — batch update order field.
 * Body: { items: [{ id, order }, ...] }
 */
router.post(
  '/reorder',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  validate(reorderSchema),
  async (req, res, next) => {
    try {
      await reorderFAQ(req.body.items);

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: 'faq.reorder',
        targetCollection: 'faq',
        targetId: 'batch',
        details: { count: req.body.items.length },
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
