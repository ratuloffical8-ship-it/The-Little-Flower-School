// src/types/index.ts

/* ── Admin Roles (Firebase custom claims) ── */

export const ADMIN_ROLES = [
  'super_admin',
  'school_admin',
  'accountant',
  'teacher',
  'admission_officer',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

/* ── Permission Keys ── */

export const PERMISSION_KEYS = [
  'admissions.read',
  'admissions.write',
  'admissions.review',
  'students.read',
  'students.write',
  'classes.read',
  'classes.write',
  'teachers.read',
  'teachers.write',
  'attendance.read',
  'attendance.write',
  'exams.read',
  'exams.write',
  'results.read',
  'results.write',
  'results.publish',
  'fees.read',
  'fees.write',
  'payments.verify',
  'expenses.read',
  'expenses.write',
  'notices.read',
  'notices.write',
  'gallery.read',
  'gallery.write',
  'faqs.read',
  'faqs.write',
  'contacts.read',
  'contacts.write',
  'reports.read',
  'reports.export',
  'settings.read',
  'settings.write',
  'admins.read',
  'admins.write',
  'audit.read',
  'backup.read',
  'backup.write',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/* ── Academic Session ── */

export interface Session {
  id: string;
  name: string; // e.g. "2024-2025"
  startDate: string; // ISO date
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── Class & Section ── */

export interface SchoolClass {
  id: string;
  name: string; // e.g. "Play", "Class 1"
  nameBn: string; // e.g. "প্লে", "প্রথম শ্রেণি"
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  classId: string;
  name: string; // e.g. "A", "B"
  teacherId?: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Subject ── */

export interface Subject {
  id: string;
  name: string;
  nameBn: string;
  code: string;
  classIds: string[];
  fullMarks: number;
  passMarks: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── Student ── */

export interface Student {
  id: string; // TLFS-STU-YYYY-0001
  nameBn: string;
  nameEn: string;
  dateOfBirth: string;
  gender: Gender;
  birthRegNo: string;
  photoPath?: string;
  classId: string;
  sectionId: string;
  sessionId: string;
  admissionApplicationId?: string;
  status: StudentStatus;
  guardianIds: string[];
  currentAddress: string;
  permanentAddress: string;
  previousSchool?: string;
  previousClass?: string;
  createdAt: string;
  updatedAt: string;
}

export type StudentStatus = 'active' | 'inactive' | 'transferred' | 'graduated';

export type Gender = 'male' | 'female' | 'other';

/* ── Guardian ── */

export interface Guardian {
  id: string;
  studentId: string;
  fatherName: string;
  motherName: string;
  guardianName?: string;
  guardianRelation?: string;
  primaryMobile: string;
  secondaryMobile?: string;
  email?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Teacher / Staff ── */

export interface Teacher {
  id: string;
  nameBn: string;
  nameEn: string;
  designation: string;
  designationBn: string;
  department?: string;
  mobile: string;
  email?: string;
  photoPath?: string;
  joinDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── Attendance ── */

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceRecord {
  id: string; // {studentId}_{date}
  studentId: string;
  classId: string;
  sectionId: string;
  sessionId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  markedBy: string; // admin uid
  createdAt: string;
  updatedAt: string;
}

/* ── Exam & Result ── */

export interface Exam {
  id: string;
  name: string;
  nameBn: string;
  sessionId: string;
  classId: string;
  startDate: string;
  endDate: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExamSubject {
  id: string;
  examId: string;
  subjectId: string;
  fullMarks: number;
  passMarks: number;
}

export interface Result {
  id: string;
  examId: string;
  studentId: string;
  sessionId: string;
  classId: string;
  marks: SubjectMark[];
  totalObtained: number;
  totalFull: number;
  percentage: number;
  gpa: number;
  grade: string;
  isPassed: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectMark {
  subjectId: string;
  subjectName: string;
  fullMarks: number;
  obtained: number;
  grade: string;
  gpa: number;
}

/* ── Notice ── */

export interface Notice {
  id: string;
  titleBn: string;
  titleEn: string;
  descriptionBn?: string;
  descriptionEn?: string;
  isImportant: boolean;
  isPublished: boolean;
  publicationDate: string;
  pdfPath?: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Gallery ── */

export interface GalleryItem {
  id: string;
  title: string;
  caption?: string;
  category: string;
  imagePath: string;
  isPublished: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/* ── FAQ ── */

export interface FAQ {
  id: string;
  questionBn: string;
  questionEn: string;
  answerBn: string;
  answerEn: string;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── Contact Message ── */

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/* ── School Settings ── */

export interface SchoolSettings {
  id: 'default'; // singleton doc
  schoolNameBn: string;
  schoolNameEn: string;
  establishedYear: number;
  address: string;
  phone: string;
  email: string;
  website?: string;
  socialLinks: {
    facebook?: string;
    youtube?: string;
    instagram?: string;
    twitter?: string;
  };
  bkashNumber?: string;
  nagadNumber?: string;
  officeHoursBn: string;
  officeHoursEn: string;
  mapLink?: string;
  principalNameBn: string;
  principalNameEn: string;
  principalMessageBn: string;
  principalMessageEn: string;
  principalPhotoPath?: string;
  heroTextBn?: string;
  heroTextEn?: string;
  aboutTextBn: string;
  aboutTextEn: string;
  missionBn: string;
  missionEn: string;
  visionBn: string;
  visionEn: string;
  gradingScale: GradingRule[];
  defaultClasses: string[];
  updatedAt: string;
}

export interface GradingRule {
  minPercent: number;
  maxPercent: number;
  grade: string;
  gpa: number;
}

/* ── Cursor Pagination ── */

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/* ── Audit Log ── */

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole: AdminRole;
  action: string; // e.g. "admission.approve", "payment.verify"
  resourceType: string; // e.g. "admissionApplication", "payment"
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

/* ── Counter Doc ── */

export interface Counter {
  id: string; // e.g. "admission_2025", "student_2025"
  value: number;
}
