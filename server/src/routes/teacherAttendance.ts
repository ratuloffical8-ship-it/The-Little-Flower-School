// server/src/routes/teacherAttendance.ts
import { Router, type Request, type Response, type RequestHandler } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth';
import { logAudit } from '../services/audit.service';
import {
  getTeacherDay,
  getTeacherMonth,
  markTeacherDay,
} from '../services/teacherAttendance.service';
import { badRequest } from '../utils/errors';

/**
 * Mounted by routes/attendance.ts at /api/attendance/teachers (verifyToken is already applied there).
 * Only super_admin / school_admin may read or mark teacher attendance.
 */
const router = Router();
router.use(requireRole('super_admin', 'school_admin'));

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

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Invalid date');

const todayBd = (): string => new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);

const dayQuery = z.object({ date: isoDate });
const monthQuery = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM') });

const markSchema = z.object({
  date: isoDate,
  records: z
    .array(
      z.object({
        teacherId: z.string().trim().min(1),
        status: z.enum(['present', 'absent', 'late', 'leave']),
        classesTaught: z.coerce.number().int().min(0).max(20).optional(),
        note: z.string().trim().max(200).optional(),
      }),
    )
    .min(1)
    .max(300),
});

// GET /api/attendance/teachers/day?date=YYYY-MM-DD → { items }
router.get(
  '/day',
  ah(async (req, res) => {
    const { date } = parse(dayQuery, req.query);
    res.json({ items: await getTeacherDay(date) });
  }),
);

// GET /api/attendance/teachers/month?month=YYYY-MM → { items, summary }
router.get(
  '/month',
  ah(async (req, res) => {
    const { month } = parse(monthQuery, req.query);
    res.json(await getTeacherMonth(month));
  }),
);

// POST /api/attendance/teachers/mark  { date, records: [{ teacherId, status, classesTaught?, note? }] }
router.post(
  '/mark',
  ah(async (req, res) => {
    const body = parse(markSchema, req.body);
    if (body.date > todayBd()) throw badRequest('Cannot mark attendance for a future date');

    const { saved } = await markTeacherDay(body.date, body.records, req.user!.uid);
    await logAudit({
      actorUid: req.user!.uid,
      action: 'teacherAttendance.mark',
      targetCollection: 'teacherAttendance',
      targetId: body.date,
    });
    res.json({ success: true, saved });
  }),
);

export default router;
