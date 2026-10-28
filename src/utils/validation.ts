// src/utils/validation.ts
import { z } from 'zod';

/* ── Constants ── */

export const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;
export const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB
export const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_SCREENSHOT_SIZE = 3 * 1024 * 1024; // 3 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/* ── Reusable Zod Schemas ── */

/**
 * Bangladeshi mobile number: 01XXXXXXXXX (11 digits, starts with 013-019)
 */
export const bdPhoneSchema = z
  .string()
  .regex(BD_PHONE_REGEX, 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX) / Enter a valid BD mobile number');

/**
 * Optional BD phone
 */
export const optionalBdPhoneSchema = z
  .string()
  .regex(BD_PHONE_REGEX, 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন')
  .or(z.literal(''))
  .optional();

/**
 * Email (optional)
 */
export const optionalEmailSchema = z
  .string()
  .email('সঠিক ইমেইল দিন / Enter a valid email')
  .or(z.literal(''))
  .optional();

/**
 * Required non-empty string with min/max
 */
export const requiredString = (min = 1, max = 200) =>
  z
    .string()
    .min(min, 'এই ঘরটি পূরণ করুন / This field is required')
    .max(max, `সর্বোচ্চ ${max} অক্ষর / Maximum ${max} characters`);

/**
 * Bengali name (allows Bengali characters, spaces, hyphens)
 */
export const bengaliNameSchema = z
  .string()
  .min(2, 'নাম কমপক্ষে ২ অক্ষর হতে হবে')
  .max(100, 'নাম সর্বোচ্চ ১০০ অক্ষর')
  .regex(/^[\u0980-\u09FF\s\-\.]+$/, 'শুধুমাত্র বাংলা অক্ষর ব্যবহার করুন');

/**
 * English name (allows Latin characters, spaces, hyphens, dots)
 */
export const englishNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters')
  .regex(/^[a-zA-Z\s\-\.']+$/, 'Only English letters allowed');

/**
 * Date of birth — must be in the past, reasonable range
 */
export const dobSchema = z
  .string()
  .min(1, 'জন্মতারিখ দিন / Date of birth is required')
  .refine(
    (val) => {
      const date = new Date(val);
      const now = new Date();
      const minDate = new Date('1990-01-01');
      return !isNaN(date.getTime()) && date < now && date > minDate;
    },
    { message: 'সঠিক জন্মতারিখ দিন / Enter a valid date of birth' },
  );

/**
 * Gender
 */
export const genderSchema = z.enum(['male', 'female', 'other'], {
  required_error: 'লিঙ্গ নির্বাচন করুন / Select gender',
});

/**
 * File validation helper (for use in custom refine)
 */
export function validateFile(
  file: File | null | undefined,
  options: {
    required?: boolean;
    maxSize?: number;
    allowedTypes?: string[];
  } = {},
): string | null {
  const { required = false, maxSize = MAX_DOC_SIZE, allowedTypes = ALLOWED_DOC_TYPES } = options;

  if (!file) {
    return required ? 'ফাইল আপলোড করুন / File is required' : null;
  }

  if (file.size > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
    return `ফাইলের আকার ${maxMB}MB এর বেশি হতে পারবে না / File must be under ${maxMB}MB`;
  }

  if (!allowedTypes.includes(file.type)) {
    return 'এই ধরনের ফাইল গ্রহণযোগ্য নয় / File type not allowed';
  }

  return null;
}

/* ── Form Schemas ── */

/**
 * Admission form — Step 1: Student info
 */
export const admissionStep1Schema = z.object({
  studentNameBn: bengaliNameSchema,
  studentNameEn: englishNameSchema,
  dateOfBirth: dobSchema,
  gender: genderSchema,
  birthRegNo: requiredString(5, 50),
  applyingClassId: requiredString(1, 50),
  previousSchool: z.string().max(200).optional(),
  previousClass: z.string().max(50).optional(),
  previousResult: z.string().max(200).optional(),
  currentAddress: requiredString(5, 500),
  permanentAddress: requiredString(5, 500),
  sameAsCurrent: z.boolean().optional(),
});

/**
 * Admission form — Step 2: Guardian info
 */
export const admissionStep2Schema = z.object({
  fatherName: requiredString(2, 100),
  motherName: requiredString(2, 100),
  guardianName: z.string().max(100).optional(),
  guardianRelation: z.string().max(50).optional(),
  primaryMobile: bdPhoneSchema,
  secondaryMobile: optionalBdPhoneSchema,
  email: optionalEmailSchema,
  guardianAddress: z.string().max(500).optional(),
});

/**
 * Admission form — Step 3: Consent
 */
export const admissionStep3Schema = z.object({
  consent: z.literal(true, {
    errorMap: () => ({ message: 'সম্মতি প্রদান আবশ্যক / Consent is required' }),
  }),
});

/**
 * Full admission form schema (all steps combined)
 */
export const admissionFormSchema = admissionStep1Schema
  .merge(admissionStep2Schema)
  .merge(admissionStep3Schema);

/**
 * Application status lookup
 */
export const statusLookupSchema = z.object({
  applicationId: requiredString(5, 50),
  guardianMobile: bdPhoneSchema,
});

/**
 * Result lookup
 */
export const resultLookupSchema = z.object({
  studentId: requiredString(5, 50),
  examId: requiredString(1, 50),
  dateOfBirth: dobSchema,
});

/**
 * Payment submission
 */
export const paymentSubmissionSchema = z.object({
  studentIdOrApplicationId: requiredString(5, 50),
  guardianMobile: bdPhoneSchema,
  payerMobile: bdPhoneSchema,
  provider: z.enum(['bkash', 'nagad', 'cash', 'bank']),
  transactionId: requiredString(5, 100),
  amount: z
    .number({ required_error: 'পরিমাণ দিন' })
    .min(1, 'পরিমাণ কমপক্ষে ১ টাকা')
    .max(9999999, 'পরিমাণ সর্বোচ্চ ৯৯,৯৯,৯৯৯ টাকা'),
  purpose: requiredString(2, 200),
});

/**
 * Contact form
 */
export const contactFormSchema = z.object({
  name: requiredString(2, 100),
  email: z.string().email('সঠিক ইমেইল দিন'),
  phone: bdPhoneSchema,
  subject: requiredString(2, 200),
  message: requiredString(10, 2000),
  honeypot: z.string().max(0, 'Spam detected').optional(),
});

/**
 * Admin login
 */
export const loginSchema = z.object({
  email: z.string().email('সঠিক ইমেইল দিন / Enter a valid email'),
  password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর / Minimum 6 characters'),
});
