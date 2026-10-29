// server/src/routes/payments.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { upload } from '../utils/upload';
import { badRequest, notFound } from '../utils/errors';
import { logAudit } from '../services/audit.service';
import {
  submitPayment,
  listPayments,
  getPaymentById,
  reviewPayment,
} from '../services/payment.service';
import { createInvoice, listInvoices, cancelInvoice } from '../services/invoice.service';

const router = Router();

const FINANCE_ROLES = ['super_admin', 'school_admin', 'accountant'] as const;

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

const submitSchema = z.object({
  studentId: z
    .string()
    .trim()
    .regex(/^TLFS-STU-\d{4}-\d{4}$/i, 'Invalid student ID')
    .transform((s) => s.toUpperCase()),
  mobile: bdMobile,
  provider: z.enum(['bkash', 'nagad']),
  trxId: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{6,20}$/i, 'Invalid transaction ID')
    .transform((s) => s.toUpperCase()),
  senderNumber: bdMobile,
  amount: z.coerce.number().positive().max(1_000_000),
  invoiceId: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(60).optional()),
});

const pageFields = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const listPaymentsSchema = z.object({
  status: z.preprocess(emptyToUndefined, z.enum(['pending', 'verified', 'rejected']).optional()),
  provider: z.preprocess(emptyToUndefined, z.enum(['bkash', 'nagad']).optional()),
  studentId: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  ...pageFields,
});

const listInvoicesSchema = z.object({
  status: z.preprocess(
    emptyToUndefined,
    z.enum(['unpaid', 'partial', 'paid', 'cancelled']).optional()
  ),
  studentId: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  ...pageFields,
});

const createInvoiceSchema = z.object({
  studentId: z.string().trim().min(1).max(40),
  feeType: z.string().trim().min(1).max(80),
  amount: z.coerce.number().positive().max(1_000_000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD'),
  note: z.string().trim().max(500).optional(),
});

const reviewSchema = z.object({
  decision: z.enum(['verified', 'rejected']),
  note: z.string().trim().max(500).optional(),
});

// ───────────────────────── Public ─────────────────────────

router.post(
  '/submit',
  rateLimit({ windowMs: 60_000, max: 5 }),
  upload.single('screenshot'),
  ah(async (req, res) => {
    const input = parse(submitSchema, req.body);
    const file = req.file
      ? { buffer: req.file.buffer, mimetype: req.file.mimetype }
      : undefined;

    const paymentId = await submitPayment(input, file);
    res.status(201).json({ success: true, paymentId });
  })
);

// ───────────────────────── Admin: invoices ─────────────────────────
// Declared before '/:id' so "invoices" is not captured as an ID.

router.get(
  '/invoices',
  verifyToken,
  requireRole(...FINANCE_ROLES),
  ah(async (req, res) => {
    const params = parse(listInvoicesSchema, req.query);
    res.json(await listInvoices(params));
  })
);

router.post(
  '/invoices',
  verifyToken,
  requireRole(...FINANCE_ROLES),
  ah(async (req, res) => {
    const input = parse(createInvoiceSchema, req.body);
    const invoice = await createInvoice(input, actor(req));
    await logAudit({
      actorUid: actor(req),
      action: 'invoice.create',
      targetCollection: 'invoices',
      targetId: invoice.id,
    });
    res.status(201).json(invoice);
  })
);

router.patch(
  '/invoices/:id/cancel',
  verifyToken,
  requireRole(...FINANCE_ROLES),
  ah(async (req, res) => {
    const invoice = await cancelInvoice(req.params.id);
    await logAudit({
      actorUid: actor(req),
      action: 'invoice.cancel',
      targetCollection: 'invoices',
      targetId: req.params.id,
    });
    res.json(invoice);
  })
);

// ───────────────────────── Admin: payments ─────────────────────────

router.get(
  '/',
  verifyToken,
  requireRole(...FINANCE_ROLES),
  ah(async (req, res) => {
    const params = parse(listPaymentsSchema, req.query);
    res.json(await listPayments(params));
  })
);

router.get(
  '/:id',
  verifyToken,
  requireRole(...FINANCE_ROLES),
  ah(async (req, res) => {
    const payment = await getPaymentById(req.params.id);
    if (!payment) throw notFound('Payment not found');
    res.json(payment);
  })
);

router.patch(
  '/:id/review',
  verifyToken,
  requireRole(...FINANCE_ROLES),
  ah(async (req, res) => {
    const { decision, note } = parse(reviewSchema, req.body);
    const payment = await reviewPayment(req.params.id, decision, note, actor(req));
    await logAudit({
      actorUid: actor(req),
      action: `payment.${decision}`,
      targetCollection: 'payments',
      targetId: req.params.id,
    });
    res.json(payment);
  })
);

export default router;
