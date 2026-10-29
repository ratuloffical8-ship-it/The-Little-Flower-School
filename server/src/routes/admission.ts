// server/src/routes/admission.ts
import { Router } from 'express';
import { upload, getFile } from '../utils/upload';
import { validate } from '../middleware/validate';
import { verifyToken, requireRole } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import {
  admissionApplySchema,
  statusLookupSchema,
  listApplicationsQuerySchema,
  updateApplicationStatusSchema,
  approveApplicationSchema,
} from '../schemas/admission.schema';
import {
  lookupStatus,
  getApplicationById,
  listApplications,
  updateStatus,
} from '../services/admission.service';
import { uploadFile } from '../services/storage.service';
import { getActiveSessionId } from '../services/session.service';
import { generateId } from '../services/counter.service';
import { logAudit } from '../services/audit.service';
import { db, FieldValue } from '../config/firebase';

const router = Router();

// ════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ════════════════════════════════════════════════════════════════════

/**
 * POST /api/admission/apply
 *
 * Multipart form submission for new admission applications.
 * Text fields: all 21 fields from admissionApplySchema
 * File fields: photo (required), birthCertificate (required),
 *              previousReportCard (optional), guardianNid (optional)
 *
 * Rate limited to 5 requests per minute per IP.
 * Returns: { applicationId: "TLFS-APP-2025-000001" }
 */
router.post(
  '/apply',
  rateLimit({
    windowMs: 60_000,
    max: 5,
    message: 'অনেক বেশি আবেদন। কিছুক্ষণ পর চেষ্টা করুন। / Too many applications. Please wait.',
  }),
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'birthCertificate', maxCount: 1 },
    { name: 'previousReportCard', maxCount: 1 },
    { name: 'guardianNid', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      // ── Validate text fields ────────────────────────────────────
      const parsed = admissionApplySchema.safeParse(req.body);
      if (!parsed.success) {
        const fields: Record<string, string> = {};
        parsed.error.errors.forEach((e) => {
          const key = e.path.join('.');
          if (!fields[key]) fields[key] = e.message;
        });
        res.status(400).json({ error: 'Validation failed', fields });
        return;
      }
      const form = parsed.data;

      // ── Validate required files ─────────────────────────────────
      const files = req.files as
        | Record<string, Express.Multer.File[]>
        | undefined;

      const photoFile = getFile(files, 'photo');
      const bcFile = getFile(files, 'birthCertificate');
      const rcFile = getFile(files, 'previousReportCard');
      const nidFile = getFile(files, 'guardianNid');

      if (!photoFile) {
        res.status(400).json({
          error: 'Validation failed',
          fields: { photo: 'পাসপোর্ট সাইজ ছবি প্রয়োজন / Photo is required' },
        });
        return;
      }
      if (!bcFile) {
        res.status(400).json({
          error: 'Validation failed',
          fields: {
            birthCertificate:
              'জন্ম নিবন্ধন প্রয়োজন / Birth certificate is required',
          },
        });
        return;
      }

      // ── Resolve session & generate ID ───────────────────────────
      const sessionId = await getActiveSessionId();
      const year = parseInt(sessionId, 10) || new Date().getFullYear();
      const applicationId = await generateId({ type: 'admission', year });
      const folder = `admissions/${applicationId}`;

      // ── Upload files to Firebase Storage ────────────────────────
      const documents: Record<string, string> = {};

      const [photoResult, bcResult] = await Promise.all([
        uploadFile({
          buffer: photoFile.buffer,
          originalName: photoFile.originalname,
          mimeType: photoFile.mimetype,
          folder,
          nameStem: 'photo',
        }),
        uploadFile({
          buffer: bcFile.buffer,
          originalName: bcFile.originalname,
          mimeType: bcFile.mimetype,
          folder,
          nameStem: 'birth-certificate',
        }),
      ]);
      documents.photo = photoResult.path;
      documents.birthCertificate = bcResult.path;

      if (rcFile) {
        const rcResult = await uploadFile({
          buffer: rcFile.buffer,
          originalName: rcFile.originalname,
          mimeType: rcFile.mimetype,
          folder,
          nameStem: 'report-card',
        });
        documents.previousReportCard = rcResult.path;
      }

      if (nidFile) {
        const nidResult = await uploadFile({
          buffer: nidFile.buffer,
          originalName: nidFile.originalname,
          mimeType: nidFile.mimetype,
          folder,
          nameStem: 'guardian-nid',
        });
        documents.guardianNid = nidResult.path;
      }

      // ── Write to Firestore ──────────────────────────────────────
      const docRef = db.collection('admissionApplications').doc();
      await docRef.set({
        applicationId,
        sessionId,
        student: {
          nameBn: form.studentNameBn,
          nameEn: form.studentNameEn,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          classApplyingFor: form.classApplyingFor,
          previousSchool: form.previousSchool,
          religion: form.religion,
          nationality: form.nationality,
          bloodGroup: form.bloodGroup,
        },
        guardian: {
          fatherName: form.fatherName,
          motherName: form.motherName,
          guardianName: form.guardianName,
          relationship: form.relationship,
          occupation: form.occupation,
          nid: form.nid,
          mobile: form.mobile,
          email: form.email,
          presentAddress: form.presentAddress,
          permanentAddress: form.permanentAddress,
          monthlyIncome: form.monthlyIncome,
        },
        documents,
        status: 'submitted',
        statusHistory: [
          {
            status: 'submitted',
            note: '',
            by: 'public-form',
            at: FieldValue.serverTimestamp(),
          },
        ],
        correctionNote: '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.status(201).json({ applicationId });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/admission/status
 *
 * Public status lookup with multi-factor verification.
 * Body: { applicationId, guardianMobile }
 *
 * Returns generic error on ANY mismatch to prevent enumeration.
 */
router.post(
  '/status',
  rateLimit({ windowMs: 60_000, max: 10 }),
  validate(statusLookupSchema),
  async (req, res, next) => {
    try {
      const { applicationId, guardianMobile } = req.body;
      const result = await lookupStatus(applicationId, guardianMobile);

      if (!result) {
        // Generic error — do NOT reveal which field was wrong
        res.status(404).json({
          error: 'তথ্য মেলেনি / Details do not match',
        });
        return;
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/admission
 * List applications with filters and pagination.
 */
router.get(
  '/',
  verifyToken,
  requireRole('super_admin', 'school_admin', 'admission_officer'),
  validate(listApplicationsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as any;
      const result = await listApplications({
        status: q.status,
        classApplyingFor: q.classApplyingFor,
        sessionId: q.sessionId,
        page: q.page,
        pageSize: q.pageSize,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admission/:id
 * Get a single application by Firestore document ID.
 */
router.get(
  '/:id',
  verifyToken,
  requireRole('super_admin', 'school_admin', 'admission_officer'),
  async (req, res, next) => {
    try {
      const app = await getApplicationById(req.params.id);
      if (!app) {
        res.status(404).json({ error: 'Application not found' });
        return;
      }
      res.json(app);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/admission/:id/status
 * Update application status (under_review, correction_needed, rejected).
 * For approval, use POST /:id/approve instead.
 */
router.patch(
  '/:id/status',
  verifyToken,
  requireRole('super_admin', 'school_admin', 'admission_officer'),
  validate(updateApplicationStatusSchema),
  async (req, res, next) => {
    try {
      const { status, note } = req.body;
      const app = await getApplicationById(req.params.id);
      if (!app) {
        res.status(404).json({ error: 'Application not found' });
        return;
      }

      const actor = req.user!.email ?? req.user!.uid;
      await updateStatus(req.params.id, status, note, actor);

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: `admission.status.${status}`,
        targetCollection: 'admissionApplications',
        targetId: req.params.id,
        details: { applicationId: app.applicationId, status, note },
      });

      res.json({ success: true, status });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/admission/:id/approve
 * Approve application and create a Student record.
 * Body: { classId, sessionId, rollNumber?, note? }
 */
router.post(
  '/:id/approve',
  verifyToken,
  requireRole('super_admin', 'school_admin', 'admission_officer'),
  validate(approveApplicationSchema),
  async (req, res, next) => {
    try {
      const app = await getApplicationById(req.params.id);
      if (!app) {
        res.status(404).json({ error: 'Application not found' });
        return;
      }
      if (app.status === 'approved') {
        res.status(409).json({ error: 'Application already approved' });
        return;
      }

      const { classId, sessionId, rollNumber, note } = req.body;
      const year = parseInt(sessionId, 10) || new Date().getFullYear();

      // Generate student ID
      const studentId = await generateId({ type: 'student', year });

      // Create student record
      await db.collection('students').doc().set({
        studentId,
        sessionId,
        classId,
        rollNumber: rollNumber ?? null,
        nameBn: app.student.nameBn,
        nameEn: app.student.nameEn,
        dateOfBirth: app.student.dateOfBirth,
        gender: app.student.gender,
        religion: app.student.religion,
        bloodGroup: app.student.bloodGroup,
        photo: app.documents.photo ?? '',
        guardian: {
          fatherName: app.guardian.fatherName,
          motherName: app.guardian.motherName,
          guardianName: app.guardian.guardianName,
          mobile: app.guardian.mobile,
          email: app.guardian.email,
          presentAddress: app.guardian.presentAddress,
          permanentAddress: app.guardian.permanentAddress,
        },
        applicationId: app.applicationId,
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update application status
      const actor = req.user!.email ?? req.user!.uid;
      await updateStatus(
        req.params.id,
        'approved',
        note || `Approved → Student ID: ${studentId}`,
        actor
      );

      await logAudit({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email ?? '',
        action: 'admission.approve',
        targetCollection: 'admissionApplications',
        targetId: req.params.id,
        details: { applicationId: app.applicationId, studentId, classId },
      });

      res.json({ success: true, studentId, applicationId: app.applicationId });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
