// server/src/routes/students.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { badRequest, notFound } from '../utils/errors';
import { logAudit } from '../services/audit.service';
import { getActiveSessionId } from '../services/session.service';
import {
  listStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deactivateStudent,
} from '../services/student.service';

const router = Router();

const READ_ROLES = ['super_admin', 'school_admin', 'accountant', 'teacher', 'admission_officer'] as const;
const WRITE_ROLES = ['super_admin', 'school_admin'] as const;

const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

const actor = (req: Request): string =>
  (req as Request & { user?: { uid: string } }).user?.uid ?? 'unknown';

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw badRequest(result.error.issues[0]?.message ?? 'Invalid input');
  return result.data;
}

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);
const bdMobile = z.string().trim().regex(/^(?:\+?88)?01[3-9]\d{8}$/, 'Invalid mobile number');

const listSchema = z.object({
  classId: z.preprocess(emptyToUndefined, z.string().trim().max(20).optional()),
  sessionId: z.preprocess(emptyToUndefined, z.string().trim().max(10).optional()),
  isActive: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional()
  ),
  search: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const guardianSchema = z.object({
  name: z.string().trim().min(1).max(120),
  mobile: bdMobile,
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  classId: z.string().trim().min(1).max(20),
  sessionId: z.string().trim().min(1).max(10).optional(),
  roll: z.coerce.number().int().min(1).max(999).optional(),
  guardian: guardianSchema,
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    classId: z.string().trim().min(1).max(20).optional(),
    roll: z.coerce.number().int().min(1).max(999).optional(),
    guardian: guardianSchema.partial().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

router.get(
  '/',
  verifyToken,
  requireRole(...READ_ROLES),
  ah(async (req, res) => {
    const params = parse(listSchema, req.query);
    res.json(await listStudents(params));
  })
);

router.get(
  '/:id',
  verifyToken,
  requireRole(...READ_ROLES),
  ah(async (req, res) => {
    const student = await getStudentById(req.params.id);
    if (!student) throw notFound('Student not found');
    res.json(student);
  })
);

router.post(
  '/',
  verifyToken,
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    const input = parse(createSchema, req.body);
    const sessionId = input.sessionId ?? String(await getActiveSessionId());
    const student = await createStudent({ ...input, sessionId });
    await logAudit({
      actorUid: actor(req),
      action: 'student.create',
      targetCollection: 'students',
      targetId: student.id,
    });
    res.status(201).json(student);
  })
);

router.put(
  '/:id',
  verifyToken,
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    const updates = parse(updateSchema, req.body);
    const student = await updateStudent(req.params.id, updates);
    await logAudit({
      actorUid: actor(req),
      action: 'student.update',
      targetCollection: 'students',
      targetId: req.params.id,
    });
    res.json(student);
  })
);

// Soft delete: sets isActive=false (records are referenced by attendance, results, payments).
router.delete(
  '/:id',
  verifyToken,
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    await deactivateStudent(req.params.id);
    await logAudit({
      actorUid: actor(req),
      action: 'student.deactivate',
      targetCollection: 'students',
      targetId: req.params.id,
    });
    res.json({ success: true });
  })
);

export default router;
