// server/src/schemas/common.schema.ts
import { z } from 'zod';

// ── Bangladesh phone (01XXXXXXXXX) ──────────────────────────────────
export const bdPhoneSchema = z
  .string()
  .trim()
  .regex(/^01[3-9]\d{8}$/, 'Invalid Bangladesh mobile number');

// ── NID (10, 13, or 17 digits) ──────────────────────────────────────
export const nidSchema = z
  .string()
  .trim()
  .regex(/^(\d{10}|\d{13}|\d{17})$/, 'Invalid NID number');

// ── Date (YYYY-MM-DD) ───────────────────────────────────────────────
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

// ── Pagination ──────────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

// ── Session (academic year) query ──────────────────────────────────
export const sessionQuerySchema = z.object({
  sessionId: z.string().min(1).optional(),
});

// ── Application ID format: TLFS-APP-YYYY-NNNNNN ─────────────────────
export const applicationIdSchema = z
  .string()
  .trim()
  .regex(/^TLFS-APP-\d{4}-\d{6}$/, 'Invalid application ID format');

// ── Student ID format: TLFS-STU-YYYY-NNNN ───────────────────────────
export const studentIdSchema = z
  .string()
  .trim()
  .regex(/^TLFS-STU-\d{4}-\d{4}$/, 'Invalid student ID format');

// ── Contact form (public) ───────────────────────────────────────────
export const contactFormSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  phone: bdPhoneSchema,
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(10).max(2000),
  /** Honeypot — must be empty */
  website: z.string().max(0).optional().default(''),
});

export type ContactForm = z.infer<typeof contactFormSchema>;

// ── Status lookup (public — multi-factor) ───────────────────────────
export const statusLookupSchema = z.object({
  applicationId: applicationIdSchema,
  guardianMobile: bdPhoneSchema,
});

// ── Result lookup (public — multi-factor) ───────────────────────────
export const resultLookupSchema = z.object({
  studentId: studentIdSchema,
  examId: z.string().min(1),
  dateOfBirth: isoDateSchema,
});
