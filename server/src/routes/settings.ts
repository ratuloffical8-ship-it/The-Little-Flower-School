// server/src/routes/settings.ts
import { Router, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { logAudit } from '../services/audit.service';
import { getSettings, updateSettings } from '../services/settings.service';
import { badRequest } from '../utils/errors';

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

// Empty string is allowed so an admin can clear a number
const optionalMobile = z
  .string()
  .trim()
  .regex(/^(?:(?:\+?88)?01[3-9]\d{8})?$/, 'Invalid Bangladeshi mobile number');

const updateSchema = z
  .object({
    schoolName: z.string().trim().min(1).max(150),
    address: z.string().trim().max(300),
    phone: z.string().trim().max(30),
    email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(254)]),
    bkashNumber: optionalMobile,
    nagadNumber: optionalMobile,
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

router.use(verifyToken, requireRole('super_admin', 'school_admin'));

router.get(
  '/',
  ah(async (_req, res) => {
    res.json({ item: await getSettings() });
  }),
);

router.put(
  '/',
  ah(async (req, res) => {
    const body = parse(updateSchema, req.body);
    await updateSettings(body);
    await logAudit({
      actorUid: req.user!.uid,
      action: 'settings.update',
      targetCollection: 'schoolSettings',
      targetId: 'main',
    });
    res.json({ success: true, item: await getSettings() });
  }),
);

export default router;
