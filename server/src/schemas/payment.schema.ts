// server/src/schemas/payment.schema.ts
import { z } from 'zod';
import { bdPhoneSchema } from './common.schema';

// ── Payment submission (public) ─────────────────────────────────────
export const paymentSubmitSchema = z.object({
  studentIdOrApplicationId: z.string().trim().min(5).max(50),
  guardianMobile: bdPhoneSchema,
  payerMobile: bdPhoneSchema,
  provider: z.enum(['bkash', 'nagad']),
  transactionId: z
    .string()
    .trim()
    .min(6)
    .max(50)
    .regex(/^[A-Z0-9]+$/i, 'Transaction ID must be alphanumeric'),
  amount: z.coerce.number().int().min(1).max(1_000_000),
  purpose: z.enum([
    'admission_fee',
    'monthly_tuition',
    'exam_fee',
    'session_fee',
    'other',
  ]),
  purposeNote: z.string().trim().max(200).optional().default(''),
});

export type PaymentSubmitInput = z.infer<typeof paymentSubmitSchema>;

// ── Admin: verify/reject payment ────────────────────────────────────
export const verifyPaymentSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  verifierNote: z.string().trim().max(1000).optional().default(''),
  /** Invoice to apply this payment to (optional — can be unapplied first) */
  invoiceId: z.string().optional(),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

// ── Admin: list payments ────────────────────────────────────────────
export const listPaymentsQuerySchema = z.object({
  status: z.enum(['pending', 'verified', 'rejected']).optional(),
  provider: z.enum(['bkash', 'nagad']).optional(),
  sessionId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Admin: create invoice ───────────────────────────────────────────
export const createInvoiceSchema = z.object({
  studentId: z.string().min(1),
  sessionId: z.string().min(1),
  feeType: z.enum([
    'admission_fee',
    'monthly_tuition',
    'exam_fee',
    'session_fee',
    'other',
  ]),
  amount: z.coerce.number().int().min(1).max(1_000_000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(500).optional().default(''),
  month: z.string().optional(), // YYYY-MM for monthly tuition
});

// ── Admin: expense entry ────────────────────────────────────────────
export const createExpenseSchema = z.object({
  category: z.string().trim().min(2).max(100),
  amount: z.coerce.number().int().min(1).max(10_000_000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().max(500),
  sessionId: z.string().min(1),
});
