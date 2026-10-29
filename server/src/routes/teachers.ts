// server/src/routes/teachers.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { badRequest, notFound } from '../utils/errors';
import { logAudit } from '../services/audit.service';
import {
  listTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} from '../services/teacher.service';

const router = Router();

const READ_ROLES = ['super_admin', 'school_admin', 'teacher'] as const;
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

const listSchema = z.object({
  isActive: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional()
  ),
});

const teacherFields = {
  name: z.string().trim().min(1).max(120),
  designation: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(120),
  phone: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^(?:\+?88)?01[3-9]\d{8}$/, 'Invalid mobile number')
      .optional()
  ),
  email: z.preprocess(emptyToUndefined, z.string().trim().email().max(120).optional()),
  isActive: z.boolean().optional(),
};

const createSchema = z.object(teacherFields);

const updateSchema = z
  .object(teacherFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

router.get(
  '/',
  verifyToken,
  requireRole(...READ_ROLES),
  ah(async (req, res) => {
    const { isActive } = parse(listSchema, req.query);
    res.json({ items: await listTeachers(isActive) });
  })
);

router.get(
  '/:id',
  verifyToken,
  requireRole(...READ_ROLES),
  ah(async (req, res) => {
    const teacher = await getTeacherById(req.params.id);
    if (!teacher) throw notFound('Teacher not found');
    res.json(teacher);
  })
);

router.post(
  '/',
  verifyToken,
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    const input = parse(createSchema, req.body);
    const teacher = await createTeacher(input);
    await logAudit({
      actorUid: actor(req),
      action: 'teacher.create',
      targetCollection: 'teachers',
      targetId: teacher.id,
    });
    res.status(201).json(teacher);
  })
);

router.put(
  '/:id',
  verifyToken,
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    const updates = parse(updateSchema, req.body);
    const teacher = await updateTeacher(req.params.id, updates);
    await logAudit({
      actorUid: actor(req),
      action: 'teacher.update',
      targetCollection: 'teachers',
      targetId: req.params.id,
    });
    res.json(teacher);
  })
);

router.delete(
  '/:id',
  verifyToken,
  requireRole(...WRITE_ROLES),
  ah(async (req, res) => {
    await deleteTeacher(req.params.id);
    await logAudit({
      actorUid: actor(req),
      action: 'teacher.delete',
      targetCollection: 'teachers',
      targetId: req.params.id,
    });
    res.json({ success: true });
  })
);

export default router;
