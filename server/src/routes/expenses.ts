// server/src/routes/expenses.ts
import { Router, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { logAudit } from '../services/audit.service';
import { badRequest, notFound } from '../utils/errors';
import {
  createExpense,
  deleteExpense,
  getExpenseById,
  listExpenses,
  updateExpense,
} from '../services/expense.service';
import { isValidIsoDate } from '../services/report.service';

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
const idSchema = z.string().trim().min(1).max(128);

const expenseFields = {
  category: z.string().trim().min(1).max(60),
  amount: z
    .number()
    .min(0.01)
    .max(100_000_000)
    .transform((n) => Math.round(n * 100) / 100),
  date: dateString,
  description: z.string().trim().max(500),
};

const createSchema = z
  .object({ ...expenseFields, description: expenseFields.description.default('') })
  .strict();

const updateSchema = z
  .object(expenseFields)
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

const listQuerySchema = z
  .object({
    category: z.string().trim().min(1).max(60).optional(),
    from: dateString.optional(),
    to: dateString.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: '"from" must not be after "to"',
  });

router.use(verifyToken);

const ACCOUNTING = ['super_admin', 'school_admin', 'accountant'] as const;

router.get(
  '/',
  requireRole(...ACCOUNTING),
  ah(async (req, res) => {
    const q = parse(listQuerySchema, req.query);
    res.json(await listExpenses(q));
  }),
);

router.get(
  '/:id',
  requireRole(...ACCOUNTING),
  ah(async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const item = await getExpenseById(id);
    if (!item) throw notFound('খরচ পাওয়া যায়নি / Expense not found');
    res.json({ item });
  }),
);

router.post(
  '/',
  requireRole(...ACCOUNTING),
  ah(async (req, res) => {
    const body = parse(createSchema, req.body);
    const item = await createExpense(body, req.user!.uid);
    await logAudit({
      actorUid: req.user!.uid,
      action: 'expense.create',
      targetCollection: 'expenses',
      targetId: item.id,
    });
    res.status(201).json({ success: true, item });
  }),
);

router.put(
  '/:id',
  requireRole(...ACCOUNTING),
  ah(async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const body = parse(updateSchema, req.body);
    const item = await updateExpense(id, body);
    await logAudit({
      actorUid: req.user!.uid,
      action: 'expense.update',
      targetCollection: 'expenses',
      targetId: id,
    });
    res.json({ success: true, item });
  }),
);

router.delete(
  '/:id',
  requireRole('super_admin', 'school_admin'),
  ah(async (req, res) => {
    const id = parse(idSchema, req.params.id);
    await deleteExpense(id);
    await logAudit({
      actorUid: req.user!.uid,
      action: 'expense.delete',
      targetCollection: 'expenses',
      targetId: id,
    });
    res.json({ success: true });
  }),
);

export default router;
