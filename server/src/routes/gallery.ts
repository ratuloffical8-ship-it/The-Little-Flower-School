// server/src/routes/gallery.ts
import { Router } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload, getFile } from '../utils/upload';
import {
  listPublishedGallery,
  listCategories,
  listAllGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} from '../services/gallery.service';
import { uploadFile } from '../services/storage.service';
import { logAudit } from '../services/audit.service';
import { db } from '../config/firebase';

const router = Router();

// ════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════

const publicListQuerySchema = z.object({
  category: z.string().trim().max(50).optional(),
});

const adminListQuerySchema = z.object({
  category: z.string().trim().max(50).optional(),
  published: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createGallerySchema = z.object({
  captionBn: z.string().trim().max(500).default(''),
  captionEn: z.string().trim().max(500).default(''),
  category: z.string().trim().min(1).max(50).default('general'),
  published: z.coerce.boolean().default(true),
  order: z.coerce.number().int().default(0),
});

const updateGallerySchema = createGallerySchema.partial();

// ════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/gallery/published?category=events
 * Returns published gallery items with signed image URLs.
 */
router.get('/published', validate(publicListQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { category } = req.query as any;
    const items = await listPublishedGallery(category);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/gallery/categories
 * Returns list of distinct categories from published items.
 */
router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await listCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/gallery
 * Admin — list all with filters.
 */
router.get(
  '/',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  validate(adminListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as any;
      const result = await listAllGallery(q);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/gallery
 * Admin — upload a new image with metadata.
 */
router.post(
  '/',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res, next) => {
    try {
      const parsed = createGallerySchema.safeParse(req.body);
      if (!parsed.success) {
        const fields: Record<string, string> = {};
        parsed.error.errors.forEach((e) => {
          const key = e.path.join('.');
          if (!fields[key]) fields[key] = e.message;
        });
        res.status(400).json({ error: 'Validation failed', fields });
        return;
      }

      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const imageFile = getFile(files, 'image');

      if (!imageFile) {
        res.status(400).json({
          error: 'Validation failed',
          fields: { image: 'Image file is required' },
        });
        return;
      }

      // Reserve document ID so we can place file in a folder named by ID
      const docRef = db.collection('gallery').doc();

      const uploadResult = await uploadFile({
        buffer: imageFile.buffer,
        originalName: imageFile.originalname,
        mimeType: imageFile.mimetype,
        folder: `gallery/${docRef.id}`,
      });

      const id = await createGalleryItem({
        ...parsed.data,
        imagePath: uploadResult.path,
      });

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: 'gallery.create',
        targetCollection: 'gallery',
        targetId: id,
        details: { category: parsed.data.category },
      });

      res.status(201).json({ id, imagePath: uploadResult.path });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/gallery/:id
 * Admin — update metadata (not image). Use DELETE + re-upload to change image.
 */
router.put(
  '/:id',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  validate(updateGallerySchema),
  async (req, res, next) => {
    try {
      await updateGalleryItem(req.params.id, req.body);

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: 'gallery.update',
        targetCollection: 'gallery',
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
 * DELETE /api/gallery/:id
 * Admin — delete gallery item and its image.
 */
router.delete(
  '/:id',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  async (req, res, next) => {
    try {
      await deleteGalleryItem(req.params.id);

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: 'gallery.delete',
        targetCollection: 'gallery',
        targetId: req.params.id,
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
