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
 * Bengali name (Bengali letters, spaces, and . : , - ' ( ) — so "মো:" and "মোঃ" style prefixes work)
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
  .regex(/^[a-zA-Z\s\-\.:,'’()]+$/, 'Only English letters allowed');

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
 * (field names MUST match AdmissionFormData and the backend admissionApplySchema)
 */
export const admissionStep1Schema = z.object({
  studentNameBn: bengaliNameSchema,
  studentNameEn: englishNameSchema,
  dateOfBirth: dobSchema,
  gender: genderSchema,
  classApplyingFor: requiredString(1, 20),
  previousSchool: z.string().max(200).optional(),
  religion: requiredString(2, 50),
  nationality: requiredString(2, 50),
  bloodGroup: z.string().max(5).optional(),
});

/**
 * Admission form — Step 2: Guardian info
 */
export const admissionStep2Schema = z.object({
  fatherName: requiredString(2, 100),
  motherName: requiredString(2, 100),
  guardianName: requiredString(2, 100),
  relationship: requiredString(2, 50),
  occupation: requiredString(2, 100),
  nid: z
    .string()
    .trim()
    .regex(/^(\d{10}|\d{13}|\d{17})$/, 'এনআইডি ১০, ১৩ বা ১৭ ডিজিটের হতে হবে / NID must be 10, 13 or 17 digits'),
  mobile: bdPhoneSchema,
  email: optionalEmailSchema,
  presentAddress: requiredString(5, 500),
  permanentAddress: requiredString(5, 500),
  monthlyIncome: z.string().max(50).optional(),
});

/**
 * Admission form — Step 3: Consent (kept for compatibility, not used by the form)
 */
export const admissionStep3Schema = z.object({
  consent: z.literal(true, {
    errorMap: () => ({ message: 'সম্মতি প্রদান আবশ্যক / Consent is required' }),
  }),
});

/**
 * Full admission form schema: step 1 + step 2 + document files
 */
const imageFile = (required: boolean) =>
  z
    .custom<File | null>((v) => v === null || v === undefined || v instanceof File)
    .superRefine((file, ctx) => {
      const msg = validateFile(file ?? null, {
        required,
        maxSize: 3 * 1024 * 1024,
        allowedTypes: ALLOWED_IMAGE_TYPES,
      });
      if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
    });

export const admissionFormSchema = admissionStep1Schema.merge(admissionStep2Schema).extend({
  photo: imageFile(true),
  birthCertificate: imageFile(true),
  previousReportCard: imageFile(false),
  guardianNid: imageFile(false),
});

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
/** Cleans a BD mobile number typed in different ways: +88017…, 8801…, 0017…, spaces, dashes. */
export function normalizeBdMobile(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  let d = v.replace(/\D/g, '');
  if (d.startsWith('880') && d.length === 13) d = d.slice(2);
  d = d.replace(/^0+/, '');
  if (d.length === 10 && d.startsWith('1')) d = '0' + d;
  return d;
}

export const PAYMENT_PURPOSES = [
  { value: 'monthly_fee', bn: 'মাসিক বেতন', en: 'Monthly tuition fee' },
  { value: 'exam_fee', bn: 'পরীক্ষার ফি', en: 'Exam fee' },
  { value: 'admission_fee', bn: 'ভর্তি ফি', en: 'Admission fee' },
  { value: 'session_fee', bn: 'সেশন ফি', en: 'Session fee' },
  { value: 'due', bn: 'বকেয়া', en: 'Previous dues' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
] as const;

export const paymentSubmissionSchema = z.object({
  purpose: z.enum(['monthly_fee', 'exam_fee', 'admission_fee', 'session_fee', 'due', 'other'], {
    errorMap: () => ({ message: 'কিসের জন্য টাকা দিচ্ছেন বেছে নিন / Choose what you are paying for' }),
  }),
  note: z.string().trim().max(200, 'সর্বোচ্চ ২০০ অক্ষর').optional(),
  studentId: z
    .string()
    .trim()
    .regex(/^TLFS-STU-\d{4}-\d{4}$/i, 'সঠিক স্টুডেন্ট আইডি দিন (TLFS-STU-2026-0001) / Enter a valid Student ID'),
  mobile: z.string().transform((v) => String(normalizeBdMobile(v))).pipe(bdPhoneSchema),
  senderNumber: z.string().transform((v) => String(normalizeBdMobile(v))).pipe(bdPhoneSchema),
  provider: z.enum(['bkash', 'nagad']),
  trxId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6,20}$/, 'সঠিক ট্রানজেকশন আইডি দিন / Enter a valid transaction ID'),
  amount: z
    .number({ required_error: 'পরিমাণ দিন', invalid_type_error: 'পরিমাণ দিন' })
    .min(1, 'পরিমাণ কমপক্ষে ১ টাকা')
    .max(1000000, 'পরিমাণ সর্বোচ্চ ১০,০০,০০০ টাকা'),
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
