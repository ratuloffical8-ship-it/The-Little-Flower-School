// server/src/routes/results.ts
import { Router, type Request, type Response, type RequestHandler } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { logAudit } from '../services/audit.service';
import { getExamById, listPublishedExams } from '../services/exam.service';
import {
  saveResults,
  listExamResults,
  getResult,
  deleteResult,
  lookupPublishedResult,
} from '../services/result.service';
import { badRequest, notFound } from '../utils/errors';

const router = Router();
const entryRoles: RequestHandler[] = [
  verifyToken,
  requireRole('super_admin', 'school_admin', 'teacher'),
];
const deleteRoles: RequestHandler[] = [verifyToken, requireRole('super_admin', 'school_admin')];

const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw badRequest(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  return r.data;
}

const lookupSchema = z.object({
  examId: z.string().trim().min(1).max(60),
  studentId: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .transform((v) => v.toUpperCase()),
  mobile: z.string().trim().min(10).max(20),
});

const saveSchema = z.object({
  entries: z
    .array(
      z.object({
        studentId: z.string().trim().min(1),
        marks: z.record(z.string(), z.number().min(0).nullable()),
      }),
    )
    .min(1)
    .max(300),
});

// ───────── Public ─────────

// GET /api/results/exams/published
router.get(
  '/exams/published',
  ah(async (_req, res) => {
    const items = await listPublishedExams();
    res.json({ items });
  }),
);

// POST /api/results/lookup
router.post(
  '/lookup',
  rateLimit({ windowMs: 60_000, max: 10 }),
  ah(async (req, res) => {
    const body = parse(lookupSchema, req.body);
    const result = await lookupPublishedResult(body);
    res.json(result);
  }),
);

// ───────── Admin / staff ─────────

// GET /api/results/exam/:examId
router.get(
  '/exam/:examId',
  ...entryRoles,
  ah(async (req, res) => {
    const exam = await getExamById(req.params.examId);
    if (!exam) throw notFound('Exam not found');
    const items = await listExamResults(req.params.examId);
    res.json({ exam, items });
  }),
);

// PUT /api/results/exam/:examId  body { entries: [{ studentId, marks: { [subject]: number|null } }] }
router.put(
  '/exam/:examId',
  ...entryRoles,
  ah(async (req, res) => {
    const { entries } = parse(saveSchema, req.body);
    const { saved } = await saveResults(req.params.examId, entries, req.user!.uid);
    await logAudit({
      actorUid: req.user!.uid,
      action: 'result.save',
      targetCollection: 'results',
      targetId: req.params.examId,
    });
    res.json({ success: true, saved });
  }),
);

// GET /api/results/exam/:examId/student/:studentId
router.get(
  '/exam/:examId/student/:studentId',
  ...entryRoles,
  ah(async (req, res) => {
    const item = await getResult(req.params.examId, req.params.studentId);
    if (!item) throw notFound('Result not found');
    res.json({ item });
  }),
);

// DELETE /api/results/exam/:examId/student/:studentId
router.delete(
  '/exam/:examId/student/:studentId',
  ...deleteRoles,
  ah(async (req, res) => {
    await deleteResult(req.params.examId, req.params.studentId);
    await logAudit({
      actorUid: req.user!.uid,
      action: 'result.delete',
      targetCollection: 'results',
      targetId: `${req.params.examId}_${req.params.studentId}`,
    });
    res.json({ success: true });
  }),
);

export default router;
