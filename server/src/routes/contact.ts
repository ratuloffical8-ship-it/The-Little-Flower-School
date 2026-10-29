// server/src/routes/contact.ts
import { Router } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { contactFormSchema } from '../schemas/common.schema';
import { db, FieldValue } from '../config/firebase';
import { logAudit } from '../services/audit.service';

const router = Router();

const COLLECTION = 'contactMessages';

// ════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════

const listQuerySchema = z.object({
  status: z.enum(['new', 'read', 'replied', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const updateStatusSchema = z.object({
  status: z.enum(['new', 'read', 'replied', 'archived']),
  note: z.string().trim().max(1000).optional().default(''),
});

// ════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINT
// ════════════════════════════════════════════════════════════════════

/**
 * POST /api/contact
 *
 * Public contact form submission.
 * - Rate limited: 3 submissions per minute per IP
 * - Honeypot: if `website` field is non-empty, silently accept (don't save)
 * - Status starts as 'new'
 */
router.post(
  '/',
  rateLimit({
    windowMs: 60_000,
    max: 3,
    message:
      'অনেক বেশি অনুরোধ। কিছুক্ষণ পর চেষ্টা করুন। / Too many requests. Please wait.',
  }),
  validate(contactFormSchema),
  async (req, res, next) => {
    try {
      const { name, email, phone, subject, message, website } = req.body;

      // ── Honeypot check ──────────────────────────────────────────
      // Bots typically fill all fields including hidden "website" field.
      // Silently return success to avoid tipping off the bot.
      if (website && website.length > 0) {
        res.status(200).json({ success: true });
        return;
      }

      await db.collection(COLLECTION).add({
        name,
        email,
        phone,
        subject,
        message,
        status: 'new',
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.status(201).json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// ════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/contact
 * Admin — list messages with filters and pagination.
 */
router.get(
  '/',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  validate(listQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { status, page, pageSize } = req.query as any;

      let query: FirebaseFirestore.Query = db.collection(COLLECTION);
      if (status) query = query.where('status', '==', status);

      const countSnap = await query.count().get();
      const total = countSnap.data().count;

      const snap = await query
        .orderBy('createdAt', 'desc')
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .get();

      const items = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          email: d.email,
          phone: d.phone,
          subject: d.subject,
          message: d.message,
          status: d.status ?? 'new',
          createdAt: (d.createdAt as any)?.toDate?.() ?? new Date(),
        };
      });

      res.json({ items, total, page, pageSize });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/contact/:id
 * Admin — get single message.
 */
router.get(
  '/:id',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  async (req, res, next) => {
    try {
      const snap = await db.collection(COLLECTION).doc(req.params.id).get();
      if (!snap.exists) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }
      const d = snap.data()!;
      res.json({
        id: snap.id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        subject: d.subject,
        message: d.message,
        status: d.status ?? 'new',
        createdAt: (d.createdAt as any)?.toDate?.() ?? new Date(),
        updatedAt: (d.updatedAt as any)?.toDate?.() ?? new Date(),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/contact/:id
 * Admin — update status (new → read → replied → archived).
 */
router.patch(
  '/:id',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  validate(updateStatusSchema),
  async (req, res, next) => {
    try {
      const { status, note } = req.body;
      await db.collection(COLLECTION).doc(req.params.id).update({
        status,
        statusNote: note,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: `contact.status.${status}`,
        targetCollection: COLLECTION,
        targetId: req.params.id,
        details: { note },
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/contact/:id
 * Admin — delete message permanently.
 */
router.delete(
  '/:id',
  verifyToken,
  requireRole('super_admin', 'school_admin'),
  async (req, res, next) => {
    try {
      await db.collection(COLLECTION).doc(req.params.id).delete();

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: 'contact.delete',
        targetCollection: COLLECTION,
        targetId: req.params.id,
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
