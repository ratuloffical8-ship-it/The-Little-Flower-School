// src/types/admission.ts

/* ── Application Status ── */

export const ADMISSION_STATUS_KEYS = [
  'submitted',
  'under_review',
  'correction_needed',
  'approved',
  'rejected',
] as const;

export type AdmissionStatusKey = (typeof ADMISSION_STATUS_KEYS)[number];

export const ADMISSION_STATUS_LABELS: Record<AdmissionStatusKey, { bn: string; en: string }> = {
  submitted: { bn: 'আবেদন জমা হয়েছে', en: 'Submitted' },
  under_review: { bn: 'যাচাই চলছে', en: 'Under Review' },
  correction_needed: { bn: 'সংশোধন প্রয়োজন', en: 'Correction Needed' },
  approved: { bn: 'অনুমোদিত', en: 'Approved' },
  rejected: { bn: 'বাতিল', en: 'Rejected' },
};

/* ── Application Data ── */

export interface AdmissionApplication {
  id: string; // TLFS-APP-YYYY-000001
  sessionId: string;
  status: AdmissionStatusKey;

  // Student info
  studentNameBn: string;
  studentNameEn: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  birthRegNo: string;
  birthRegDocPath?: string;
  photoPath?: string;
  applyingClassId: string;
  previousSchool?: string;
  previousClass?: string;
  previousResult?: string;
  currentAddress: string;
  permanentAddress: string;

  // Guardian info
  fatherName: string;
  motherName: string;
  guardianName?: string;
  guardianRelation?: string;
  primaryMobile: string;
  secondaryMobile?: string;
  email?: string;
  guardianAddress?: string;

  // Document paths (private storage)
  documentPaths: string[];

  // Review
  reviewedBy?: string; // admin uid
  reviewedAt?: string;
  internalNote?: string;
  correctionNote?: string;

  // Conversion
  convertedStudentId?: string; // set once when converted to student

  // Timestamps
  statusChangedAt: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Form data (frontend, before submission) ── */

export interface AdmissionFormData {
  // Step 1: Student
  studentNameBn: string;
  studentNameEn: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | '';
  classApplyingFor: string;
  previousSchool: string;
  religion: string;
  nationality: string;
  bloodGroup: string;

  // Step 2: Guardian
  fatherName: string;
  motherName: string;
  guardianName: string;
  relationship: string;
  occupation: string;
  nid: string;
  mobile: string;
  email: string;
  presentAddress: string;
  monthlyIncome: string;

  // Step 3: Documents (single file each)
  photo: File | null;
  birthCertificate: File | null;
  previousReportCard: File | null;
  guardianNid: File | null;

  // Older field names kept optional so nothing that still references them breaks
  birthRegNo?: string;
  birthRegDoc?: File | null;
  applyingClassId?: string;
  previousClass?: string;
  previousResult?: string;
  currentAddress?: string;
  permanentAddress?: string;
  sameAsCurrent?: boolean;
  guardianRelation?: string;
  primaryMobile?: string;
  secondaryMobile?: string;
  guardianAddress?: string;
  additionalDocs?: File[];
  consent?: boolean;
}

/* ── Status lookup request/response ── */

export interface StatusLookupRequest {
  applicationId: string;
  guardianMobile: string;
}

export interface StatusLookupResponse {
  applicationId: string;
  status: AdmissionStatusKey;
  statusLabel: { bn: string; en: string };
  statusChangedAt: string;
  correctionNote?: string;
}
