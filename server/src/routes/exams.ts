// server/src/routes/exams.ts
import { Router, type Request, type Response, type RequestHandler } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { logAudit } from '../services/audit.service';
import { getActiveSessionId } from '../services/session.service';
import {
  listExams,
  getExamById,
  createExam,
  updateExam,
  setExamPublished,
  deleteExam,
  type ExamSubject,
} from '../services/exam.service';
import { badRequest, notFound } from '../utils/errors';

const router = Router();
const readRoles = requireRole('super_admin', 'school_admin', 'teacher');
const writeRoles = requireRole('super_admin', 'school_admin');

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

const subjectSchema = z.object({
  name: z.string().trim().min(1).max(60),
  fullMarks: z.number().positive().max(1000),
  passMarks: z.number().min(0).max(1000).optional(),
  isOptional: z.boolean().optional(),
});

const subjectsSchema = z.array(subjectSchema).min(1).max(20);

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  classId: z.string().trim().min(1),
  sessionId: z.string().trim().min(1).optional(),
  subjects: subjectsSchema,
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    subjects: subjectsSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.subjects !== undefined, 'Nothing to update');

const listQuery = z.object({
  classId: z.string().trim().min(1).optional(),
  sessionId: z.string().trim().min(1).optional(),
  published: z.enum(['true', 'false']).optional(),
});

const publishSchema = z.object({ published: z.boolean() });

/** Pass marks default to 33% of full marks (rounded up) */
const toExamSubjects = (subjects: z.infer<typeof subjectsSchema>): ExamSubject[] =>
  subjects.map((s) => ({
    name: s.name,
    fullMarks: s.fullMarks,
    passMarks: s.passMarks ?? Math.ceil(s.fullMarks * 0.33),
    isOptional: s.isOptional ?? false,
  }));

// GET /api/exams
router.get(
  '/',
  verifyToken,
  readRoles,
  ah(async (req, res) => {
    const q = parse(listQuery, req.query);
    const items = await listExams({
      classId: q.classId,
      sessionId: q.sessionId,
      published: q.published === undefined ? undefined : q.published === 'true',
    });
    res.json({ items });
  }),
);

// GET /api/exams/:id
router.get(
  '/:id',
  verifyToken,
  readRoles,
  ah(async (req, res) => {
    const item = await getExamById(req.params.id);
    if (!item) throw notFound('Exam not found');
    res.json({ item });
  }),
);

// POST /api/exams
router.post(
  '/',
  verifyToken,
  writeRoles,
  ah(async (req, res) => {
    const body = parse(createSchema, req.body);
    const sessionId = body.sessionId ?? (await getActiveSessionId());
    const item = await createExam(
      {
        name: body.name,
        classId: body.classId,
        sessionId,
        subjects: toExamSubjects(body.subjects),
      },
      req.user!.uid,
    );
    await logAudit({
      actorUid: req.user!.uid,
      action: 'exam.create',
      targetCollection: 'exams',
      targetId: item.id,
    });
    res.status(201).json({ success: true, item });
  }),
);

// PUT /api/exams/:id
router.put(
  '/:id',
  verifyToken,
  writeRoles,
  ah(async (req, res) => {
    const body = parse(updateSchema, req.body);
    const item = await updateExam(req.params.id, {
      name: body.name,
      subjects: body.subjects ? toExamSubjects(body.subjects) : undefined,
    });
    await logAudit({
      actorUid: req.user!.uid,
      action: 'exam.update',
      targetCollection: 'exams',
      targetId: req.params.id,
    });
    res.json({ success: true, item });
  }),
);

// PATCH /api/exams/:id/publish  body { published: boolean }
router.patch(
  '/:id/publish',
  verifyToken,
  writeRoles,
  ah(async (req, res) => {
    const { published } = parse(publishSchema, req.body);
    const item = await setExamPublished(req.params.id, published);
    await logAudit({
      actorUid: req.user!.uid,
      action: published ? 'exam.publish' : 'exam.unpublish',
      targetCollection: 'exams',
      targetId: req.params.id,
    });
    res.json({ success: true, item });
  }),
);

// DELETE /api/exams/:id
router.delete(
  '/:id',
  verifyToken,
  writeRoles,
  ah(async (req, res) => {
    await deleteExam(req.params.id);
    await logAudit({
      actorUid: req.user!.uid,
      action: 'exam.delete',
      targetCollection: 'exams',
      targetId: req.params.id,
    });
    res.json({ success: true });
  }),
);

export default router;
