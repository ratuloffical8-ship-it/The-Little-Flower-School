// server/src/routes/attendance.ts
import { Router, type Request, type Response, type RequestHandler } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { logAudit } from '../services/audit.service';
import { getActiveSessionId } from '../services/session.service';
import {
  getClassAttendance,
  markAttendance,
  getStudentAttendance,
} from '../services/attendance.service';
import { badRequest } from '../utils/errors';

const router = Router();
router.use(verifyToken, requireRole('super_admin', 'school_admin', 'teacher'));

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

/** Today's date in Bangladesh time (UTC+6) as YYYY-MM-DD */
const todayBd = (): string => new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);

const classDateQuery = z.object({
  classId: z.string().trim().min(1),
  date: isoDate,
});

const markSchema = z.object({
  classId: z.string().trim().min(1),
  date: isoDate,
  records: z
    .array(
      z.object({
        studentId: z.string().trim().min(1),
        status: z.enum(['present', 'absent', 'late', 'leave']),
        note: z.string().trim().max(200).optional(),
      }),
    )
    .min(1)
    .max(300),
});

const rangeQuery = z.object({ from: isoDate, to: isoDate });

// GET /api/attendance?classId=&date=
router.get(
  '/',
  ah(async (req, res) => {
    const { classId, date } = parse(classDateQuery, req.query);
    const items = await getClassAttendance(classId, date);
    res.json({ items });
  }),
);

// POST /api/attendance/mark  (upsert for a whole class + date)
router.post(
  '/mark',
  ah(async (req, res) => {
    const body = parse(markSchema, req.body);
    if (body.date > todayBd()) throw badRequest('Cannot mark attendance for a future date');

    const sessionId = await getActiveSessionId();
    const { saved } = await markAttendance({ ...body, sessionId }, req.user!.uid);

    await logAudit({
      actorUid: req.user!.uid,
      action: 'attendance.mark',
      targetCollection: 'attendance',
      targetId: `${body.classId}_${body.date}`,
    });
    res.json({ success: true, saved });
  }),
);

// GET /api/attendance/student/:studentId?from=&to=
router.get(
  '/student/:studentId',
  ah(async (req, res) => {
    const { from, to } = parse(rangeQuery, req.query);
    if (from > to) throw badRequest('"from" must not be after "to"');
    const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    if (days > 366) throw badRequest('Date range must not exceed 366 days');

    const data = await getStudentAttendance(req.params.studentId, from, to);
    res.json(data);
  }),
);

export default router;
