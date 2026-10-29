// server/src/schemas/admission.schema.ts
import { z } from 'zod';
import { bdPhoneSchema, nidSchema, isoDateSchema } from './common.schema';

// ── Admission application (public submit) ───────────────────────────
export const admissionApplySchema = z.object({
  // Student
  studentNameBn: z.string().trim().min(2).max(100),
  studentNameEn: z.string().trim().min(2).max(100),
  dateOfBirth: isoDateSchema,
  gender: z.enum(['male', 'female', 'other']),
  classApplyingFor: z.enum([
    'play', 'nursery',
    '1', '2', '3', '4', '5',
    '6', '7', '8', '9', '10',
  ]),
  previousSchool: z.string().trim().max(200).optional().default(''),
  religion: z.string().trim().min(2).max(50),
  nationality: z.string().trim().min(2).max(50),
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''])
    .optional()
    .default(''),

  // Guardian
  fatherName: z.string().trim().min(2).max(100),
  motherName: z.string().trim().min(2).max(100),
  guardianName: z.string().trim().min(2).max(100),
  relationship: z.string().trim().min(2).max(50),
  occupation: z.string().trim().min(2).max(100),
  nid: nidSchema,
  mobile: bdPhoneSchema,
  email: z
    .string()
    .trim()
    .email()
    .max(150)
    .optional()
    .or(z.literal(''))
    .default(''),
  presentAddress: z.string().trim().min(5).max(500),
  permanentAddress: z.string().trim().min(5).max(500),
  monthlyIncome: z.string().trim().max(50).optional().default(''),
});

export type AdmissionApplyInput = z.infer<typeof admissionApplySchema>;

// ── Admin: list applications query ─────────────────────────────────
export const listApplicationsQuerySchema = z.object({
  status: z
    .enum(['submitted', 'under_review', 'correction_needed', 'approved', 'rejected'])
    .optional(),
  classApplyingFor: z.string().optional(),
  sessionId: z.string().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Admin: update application status ────────────────────────────────
export const updateApplicationStatusSchema = z.object({
  status: z.enum([
    'submitted',
    'under_review',
    'correction_needed',
    'approved',
    'rejected',
  ]),
  note: z.string().trim().max(1000).optional().default(''),
});

export type UpdateApplicationStatusInput = z.infer<
  typeof updateApplicationStatusSchema
>;

// ── Admin: approve → create student ────────────────────────────────
export const approveApplicationSchema = z.object({
  classId: z.string().min(1),
  sessionId: z.string().min(1),
  rollNumber: z.coerce.number().int().min(1).optional(),
  note: z.string().trim().max(1000).optional().default(''),
});

export type ApproveApplicationInput = z.infer<typeof approveApplicationSchema>;
