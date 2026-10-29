// server/src/routes/users.ts
import { Router, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { logAudit } from '../services/audit.service';
import { badRequest, notFound } from '../utils/errors';
import {
  ADMIN_ROLES,
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from '../services/user.service';

const router = Router();

const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest(
      result.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '),
    );
  }
  return result.data;
}

const uidSchema = z.string().trim().min(1).max(128);
const roleSchema = z.enum(ADMIN_ROLES);

const listQuerySchema = z.object({ role: roleSchema.optional() }).strict();

const createSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(128),
    name: z.string().trim().min(1).max(100),
    role: roleSchema,
  })
  .strict();

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    role: roleSchema,
    isActive: z.boolean(),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

// User management is super_admin only
router.use(verifyToken, requireRole('super_admin'));

router.get(
  '/',
  ah(async (req, res) => {
    const q = parse(listQuerySchema, req.query);
    res.json({ items: await listUsers(q) });
  }),
);

router.get(
  '/:uid',
  ah(async (req, res) => {
    const uid = parse(uidSchema, req.params.uid);
    const item = await getUserById(uid);
    if (!item) throw notFound('ব্যবহারকারী পাওয়া যায়নি / User not found');
    res.json({ item });
  }),
);

router.post(
  '/',
  ah(async (req, res) => {
    const body = parse(createSchema, req.body);
    const item = await createUser(body, req.user!.uid);
    await logAudit({
      actorUid: req.user!.uid,
      action: 'user.create',
      targetCollection: 'users',
      targetId: item.uid,
    });
    res.status(201).json({ success: true, item });
  }),
);

router.put(
  '/:uid',
  ah(async (req, res) => {
    const uid = parse(uidSchema, req.params.uid);
    const body = parse(updateSchema, req.body);
    const item = await updateUser(uid, body, req.user!.uid);
    await logAudit({
      actorUid: req.user!.uid,
      action: 'user.update',
      targetCollection: 'users',
      targetId: uid,
    });
    res.json({ success: true, item });
  }),
);

router.delete(
  '/:uid',
  ah(async (req, res) => {
    const uid = parse(uidSchema, req.params.uid);
    await deleteUser(uid, req.user!.uid);
    await logAudit({
      actorUid: req.user!.uid,
      action: 'user.delete',
      targetCollection: 'users',
      targetId: uid,
    });
    res.json({ success: true });
  }),
);

export default router;
