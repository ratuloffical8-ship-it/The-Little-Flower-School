// server/src/routes/notices.ts
import { Router } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload, getFile } from '../utils/upload';
import { rateLimit } from '../middleware/rateLimit';
import {
  listPublishedNotices,
  getPublishedNotice,
  listAllNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
} from '../services/notice.service';
import { uploadFile, getSignedUrl, deleteFile } from '../services/storage.service';
import { logAudit } from '../services/audit.service';

const router = Router();

// ════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════

const createNoticeSchema = z.object({
  titleBn: z.string().trim().min(2).max(200),
  titleEn: z.string().trim().min(2).max(200),
  descriptionBn: z.string().trim().min(2).max(5000),
  descriptionEn: z.string().trim().min(2).max(5000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  important: z.coerce.boolean().default(false),
  published: z.coerce.boolean().default(true),
});

const updateNoticeSchema = createNoticeSchema.partial();

const listQuerySchema = z.object({
  published: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  important: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/notices/published
 * Returns all published notices, newest first.
 */
router.get('/published', async (_req, res, next) => {
  try {
    const notices = await listPublishedNotices();
    res.json({ items: notices });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notices/:id/download
 * Returns a short-lived signed URL for the notice's PDF.
 * Only works for published notices.
 */
router.get(
  '/:id/download',
  rateLimit({ windowMs: 60_000, max: 20 }),
  async (req, res, next) => {
    try {
      const notice = await getPublishedNotice(req.params.id);
      if (!notice || !notice.pdfPath) {
        res.status(404).json({ error: 'PDF not available' });
        return;
      }
      const url = await getSignedUrl(notice.pdfPath, 15);
      res.json({ url, expiresIn: 15 * 60 });
    } catch (err) {
      next(err);
    }
  }
);

// ════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/notices
 * List all notices (admin — includes unpublished).
 */
router.get(
  '/',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  validate(listQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as any;
      const result = await listAllNotices(q);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/notices/:id
 * Admin — get by ID.
 */
router.get(
  '/:id',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  async (req, res, next) => {
    try {
      const notice = await getNoticeById(req.params.id);
      if (!notice) {
        res.status(404).json({ error: 'Notice not found' });
        return;
      }
      res.json(notice);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/notices
 * Admin — create a new notice. Optional PDF upload.
 */
router.post(
  '/',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  upload.fields([{ name: 'pdf', maxCount: 1 }]),
  async (req, res, next) => {
    try {
      const parsed = createNoticeSchema.safeParse(req.body);
      if (!parsed.success) {
        const fields: Record<string, string> = {};
        parsed.error.errors.forEach((e) => {
          const key = e.path.join('.');
          if (!fields[key]) fields[key] = e.message;
        });
        res.status(400).json({ error: 'Validation failed', fields });
        return;
      }

      let pdfPath: string | undefined;
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const pdfFile = getFile(files, 'pdf');

      // Create document first so we have an ID for the folder
      const id = await createNotice({ ...parsed.data });

      if (pdfFile) {
        const result = await uploadFile({
          buffer: pdfFile.buffer,
          originalName: pdfFile.originalname,
          mimeType: pdfFile.mimetype,
          folder: `notices/${id}`,
          nameStem: 'notice',
        });
        pdfPath = result.path;
        await updateNotice(id, { pdfPath });
      }

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: 'notice.create',
        targetCollection: 'notices',
        targetId: id,
        details: { titleBn: parsed.data.titleBn, hasPdf: !!pdfPath },
      });

      res.status(201).json({ id, pdfPath });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/notices/:id
 * Admin — update an existing notice. Optional PDF replacement.
 */
router.put(
  '/:id',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  upload.fields([{ name: 'pdf', maxCount: 1 }]),
  async (req, res, next) => {
    try {
      const existing = await getNoticeById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Notice not found' });
        return;
      }

      const parsed = updateNoticeSchema.safeParse(req.body);
      if (!parsed.success) {
        const fields: Record<string, string> = {};
        parsed.error.errors.forEach((e) => {
          const key = e.path.join('.');
          if (!fields[key]) fields[key] = e.message;
        });
        res.status(400).json({ error: 'Validation failed', fields });
        return;
      }

      const updates: Record<string, any> = { ...parsed.data };

      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const pdfFile = getFile(files, 'pdf');

      if (pdfFile) {
        // Delete old PDF if exists
        if (existing.pdfPath) {
          await deleteFile(existing.pdfPath).catch(() => undefined);
        }
        const result = await uploadFile({
          buffer: pdfFile.buffer,
          originalName: pdfFile.originalname,
          mimeType: pdfFile.mimetype,
          folder: `notices/${req.params.id}`,
          nameStem: 'notice',
        });
        updates.pdfPath = result.path;
      }

      await updateNotice(req.params.id, updates);

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: 'notice.update',
        targetCollection: 'notices',
        targetId: req.params.id,
        details: { changes: Object.keys(updates) },
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/notices/:id
 * Admin — delete notice and its PDF.
 */
router.delete(
  '/:id',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  async (req, res, next) => {
    try {
      const existing = await getNoticeById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Notice not found' });
        return;
      }

      await deleteNotice(req.params.id);

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: 'notice.delete',
        targetCollection: 'notices',
        targetId: req.params.id,
        details: { titleBn: existing.titleBn },
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
