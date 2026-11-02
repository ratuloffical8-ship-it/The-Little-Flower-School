// server/src/routes/teacherAttendance.ts
import { Router, type Request, type Response, type RequestHandler } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth';
import { logAudit } from '../services/audit.service';
import {
  findTeacherByEmail,
  getTeacherDay,
  getTeacherMonth,
  getAttendanceMonth,
  getTeacherDayOne,
  listLogsForDay,
  listLogsForMonth,
  buildSummary,
  markTeacherDay,
  selfCheckIn,
  createLog,
  updateLog,
  deleteLog,
  nowBd,
  type TeacherLite,
} from '../services/teacherAttendance.service';
import { badRequest, HttpError } from '../utils/errors';

/**
 * Mounted by routes/attendance.ts at /api/attendance/teachers (verifyToken is already applied there,
 * and only super_admin / school_admin / teacher get that far).
 *
 *  Teacher (own data, matched by login e-mail == teacher record e-mail):
 *    GET    /me                 today: teacher, attendance, class logs
 *    POST   /me/checkin         { status: 'present' | 'late', note? }
 *    GET    /me/month?month=    own attendance + class logs + summary
 *    GET    /me/classes?date=   own class logs of a day
 *    POST   /me/classes         add a class log (today or a past day)
 *    PUT    /me/classes/:id     edit own class log
 *    DELETE /me/classes/:id     delete own class log
 *
 *  Admin (super_admin / school_admin):
 *    GET    /day?date=          all teachers' attendance of a day
 *    GET    /month?month=       everything for a month + per-teacher summary
 *    POST   /mark               mark attendance for teachers (e.g. no smartphone)
 *    POST   /classes            add a class log on behalf of a teacher
 *    PUT    /classes/:id        edit any class log
 *    DELETE /classes/:id        delete any class log
 */
const router = Router();
const adminOnly = requireRole('super_admin', 'school_admin');

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

const dayQuery = z.object({ date: isoDate });
const monthQuery = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM') });

const checkInSchema = z.object({
  status: z.enum(['present', 'late']),
  note: z.string().trim().max(200).optional(),
});

const markSchema = z.object({
  date: isoDate,
  records: z
    .array(
      z.object({
        teacherId: z.string().trim().min(1),
        status: z.enum(['present', 'absent', 'late', 'leave']),
        note: z.string().trim().max(200).optional(),
      }),
    )
    .min(1)
    .max(300),
});

const logFields = {
  classId: z.string().trim().min(1).max(20),
  subject: z.string().trim().min(1).max(80),
  period: z.coerce.number().int().min(1).max(12).optional(),
  topic: z.string().trim().max(200).optional(),
  status: z.enum(['completed', 'partial', 'not_taken']),
  note: z.string().trim().max(300).optional(),
};
const myLogSchema = z.object({ date: isoDate.optional(), ...logFields });
const adminLogSchema = z.object({ teacherId: z.string().trim().min(1), date: isoDate, ...logFields });
const logUpdateSchema = z.object(logFields);

/** Resolve the teacher record of the logged-in user (by e-mail). */
async function me(req: Request): Promise<TeacherLite> {
  const teacher = await findTeacherByEmail(req.user!.email);
  if (!teacher) {
    throw new HttpError(
      404,
      'আপনার লগইন ইমেইলের সাথে কোনো শিক্ষকের রেকর্ড মেলেনি। অ্যাডমিনকে শিক্ষকের তথ্যে একই ইমেইল দিতে বলুন। / No teacher record matches your login email.',
    );
  }
  return teacher;
}

function assertNotFuture(date: string): void {
  if (date > nowBd().date) throw badRequest('Cannot use a future date');
}

// ───────────────────────── Teacher: own data ─────────────────────────

router.get(
  '/me',
  ah(async (req, res) => {
    const teacher = await me(req);
    const { date, time } = nowBd();
    const [attendance, classes] = await Promise.all([
      getTeacherDayOne(teacher.id, date),
      listLogsForDay(teacher.id, date),
    ]);
    res.json({ teacher, today: date, now: time, attendance, classes });
  }),
);

router.post(
  '/me/checkin',
  ah(async (req, res) => {
    const teacher = await me(req);
    const body = parse(checkInSchema, req.body);
    const attendance = await selfCheckIn(teacher.id, body.status, body.note, req.user!.uid);
    res.json({ success: true, attendance });
  }),
);

router.get(
  '/me/month',
  ah(async (req, res) => {
    const teacher = await me(req);
    const { month } = parse(monthQuery, req.query);
    const [items, classes] = await Promise.all([
      getAttendanceMonth(month, teacher.id),
      listLogsForMonth(month, teacher.id),
    ]);
    res.json({
      teacher,
      items,
      classes,
      summary: buildSummary(items, classes)[teacher.id] ?? null,
    });
  }),
);

router.get(
  '/me/classes',
  ah(async (req, res) => {
    const teacher = await me(req);
    const { date } = parse(dayQuery, req.query);
    res.json({ items: await listLogsForDay(teacher.id, date) });
  }),
);

router.post(
  '/me/classes',
  ah(async (req, res) => {
    const teacher = await me(req);
    const body = parse(myLogSchema, req.body);
    const date = body.date ?? nowBd().date;
    assertNotFuture(date);
    const item = await createLog(teacher.id, date, body, req.user!.uid);
    res.status(201).json({ success: true, item });
  }),
);

router.put(
  '/me/classes/:id',
  ah(async (req, res) => {
    const teacher = await me(req);
    const body = parse(logUpdateSchema, req.body);
    const item = await updateLog(req.params.id, teacher.id, body);
    res.json({ success: true, item });
  }),
);

router.delete(
  '/me/classes/:id',
  ah(async (req, res) => {
    const teacher = await me(req);
    await deleteLog(req.params.id, teacher.id);
    res.json({ success: true });
  }),
);

// ───────────────────────── Admin ─────────────────────────

router.get(
  '/day',
  adminOnly,
  ah(async (req, res) => {
    const { date } = parse(dayQuery, req.query);
    res.json({ items: await getTeacherDay(date) });
  }),
);

router.get(
  '/month',
  adminOnly,
  ah(async (req, res) => {
    const { month } = parse(monthQuery, req.query);
    res.json(await getTeacherMonth(month));
  }),
);

router.post(
  '/mark',
  adminOnly,
  ah(async (req, res) => {
    const body = parse(markSchema, req.body);
    assertNotFuture(body.date);
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

router.post(
  '/classes',
  adminOnly,
  ah(async (req, res) => {
    const body = parse(adminLogSchema, req.body);
    assertNotFuture(body.date);
    const item = await createLog(body.teacherId, body.date, body, req.user!.uid);
    res.status(201).json({ success: true, item });
  }),
);

router.put(
  '/classes/:id',
  adminOnly,
  ah(async (req, res) => {
    const body = parse(logUpdateSchema, req.body);
    const item = await updateLog(req.params.id, null, body);
    res.json({ success: true, item });
  }),
);

router.delete(
  '/classes/:id',
  adminOnly,
  ah(async (req, res) => {
    await deleteLog(req.params.id, null);
    res.json({ success: true });
  }),
);

export default router;
