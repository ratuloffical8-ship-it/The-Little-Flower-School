// server/src/routes/reports.ts
import { Router, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { badRequest } from '../utils/errors';
import {
  defaultMonthRange,
  getAdmissionsReport,
  getAttendanceReport,
  getDashboardSummary,
  getFinanceReport,
  isValidIsoDate,
} from '../services/report.service';

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

const dateString = z.string().trim().refine(isValidIsoDate, 'Must be YYYY-MM-DD');

const rangeQuery = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
  })
  .strict();

const attendanceQuery = rangeQuery.extend({
  classId: z.string().trim().min(1).max(40).optional(),
});

const admissionsQuery = z
  .object({ sessionId: z.string().trim().min(1).max(20).optional() })
  .strict();

router.use(verifyToken);

// Counts only (no money) — safe for every admin role
router.get(
  '/dashboard',
  requireRole('super_admin', 'school_admin', 'accountant', 'teacher', 'admission_officer'),
  ah(async (_req, res) => {
    res.json({ item: await getDashboardSummary() });
  }),
);

router.get(
  '/finance',
  requireRole('super_admin', 'school_admin', 'accountant'),
  ah(async (req, res) => {
    const q = parse(rangeQuery, req.query);
    const def = defaultMonthRange();
    res.json({ item: await getFinanceReport(q.from ?? def.from, q.to ?? def.to) });
  }),
);

router.get(
  '/admissions',
  requireRole('super_admin', 'school_admin', 'admission_officer'),
  ah(async (req, res) => {
    const q = parse(admissionsQuery, req.query);
    res.json({ item: await getAdmissionsReport(q.sessionId) });
  }),
);

router.get(
  '/attendance',
  requireRole('super_admin', 'school_admin', 'teacher'),
  ah(async (req, res) => {
    const q = parse(attendanceQuery, req.query);
    const def = defaultMonthRange();
    res.json({
      item: await getAttendanceReport({
        from: q.from ?? def.from,
        to: q.to ?? def.to,
        classId: q.classId,
      }),
    });
  }),
);

export default router;
