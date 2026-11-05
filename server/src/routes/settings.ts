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

// A link may be typed without "https://" — add it. Empty clears the link.
const optionalUrl = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return v;
    const t = v.trim();
    if (!t) return '';
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  },
  z.string().max(300).refine((v) => v === '' || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), 'Invalid link'),
);

const updateSchema = z
  .object({
    schoolNameBn: z.string().trim().min(1).max(150),
    schoolNameEn: z.string().trim().min(1).max(150),
    address: z.string().trim().max(300),
    phone: z.string().trim().max(30),
    email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(254)]),
    bkashNumber: optionalMobile,
    nagadNumber: optionalMobile,
    facebook: optionalUrl,
    youtube: optionalUrl,
    mapUrl: optionalUrl,
    aboutText: z.string().trim().max(1200),
    admissionText: z.string().trim().max(500),
    officeHours: z.string().trim().max(120),
    principalName: z.string().trim().max(100),
    principalTitle: z.string().trim().max(100),
    principalMessage: z.string().trim().max(2000),
    admissionOpen: z.boolean(),
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
    const { facebook, youtube, ...rest } = parse(updateSchema, req.body);
    const updates: Record<string, unknown> = { ...rest };
    if (facebook !== undefined || youtube !== undefined) {
      updates.socialLinks = {
        ...(facebook !== undefined ? { facebook } : {}),
        ...(youtube !== undefined ? { youtube } : {}),
      };
    }
    await updateSettings(updates);
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
