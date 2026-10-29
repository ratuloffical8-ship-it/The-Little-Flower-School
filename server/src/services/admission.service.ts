// server/src/services/admission.service.ts
import { db, FieldValue, Timestamp } from '../config/firebase';
import { generateId } from './counter.service';
import type { AdmissionApplyInput } from '../schemas/admission.schema';

/**
 * Admission service — Firestore CRUD for applications.
 *
 * Collection: `admissionApplications`
 * Document shape:
 *   {
 *     applicationId: "TLFS-APP-2025-000001",
 *     sessionId: "2025",
 *     student: { ... },
 *     guardian: { ... },
 *     documents: { photo, birthCertificate, previousReportCard?, guardianNid? },
 *     status: "submitted" | "under_review" | ...,
 *     statusHistory: [{ status, note, by, at }],
 *     correctionNote?: string,
 *     createdAt, updatedAt
 *   }
 */

const COLLECTION = 'admissionApplications';

export type AdmissionStatus =
  | 'submitted'
  | 'under_review'
  | 'correction_needed'
  | 'approved'
  | 'rejected';

export interface DocumentPaths {
  photo?: string;
  birthCertificate?: string;
  previousReportCard?: string;
  guardianNid?: string;
}

export interface CreateApplicationInput {
  form: AdmissionApplyInput;
  documents: DocumentPaths;
  sessionId: string;
}

export interface ApplicationRecord {
  id: string;
  applicationId: string;
  sessionId: string;
  student: Record<string, any>;
  guardian: Record<string, any>;
  documents: DocumentPaths;
  status: AdmissionStatus;
  correctionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ────────────────────────────────────────────────────────────────────
// Create
// ────────────────────────────────────────────────────────────────────
export async function createApplication(
  input: CreateApplicationInput
): Promise<{ id: string; applicationId: string }> {
  const year = parseInt(input.sessionId, 10) || new Date().getFullYear();
  const applicationId = await generateId({ type: 'admission', year });

  const docRef = db.collection(COLLECTION).doc();

  const { form, documents, sessionId } = input;

  await docRef.set({
    applicationId,
    sessionId,
    student: {
      nameBn: form.studentNameBn,
      nameEn: form.studentNameEn,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      classApplyingFor: form.classApplyingFor,
      previousSchool: form.previousSchool,
      religion: form.religion,
      nationality: form.nationality,
      bloodGroup: form.bloodGroup,
    },
    guardian: {
      fatherName: form.fatherName,
      motherName: form.motherName,
      guardianName: form.guardianName,
      relationship: form.relationship,
      occupation: form.occupation,
      nid: form.nid,
      mobile: form.mobile,
      email: form.email,
      presentAddress: form.presentAddress,
      permanentAddress: form.permanentAddress,
      monthlyIncome: form.monthlyIncome,
    },
    documents,
    status: 'submitted' as AdmissionStatus,
    statusHistory: [
      {
        status: 'submitted',
        note: '',
        by: 'system',
        at: Timestamp.now(),
      },
    ],
    correctionNote: '',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: docRef.id, applicationId };
}

// ────────────────────────────────────────────────────────────────────
// Public status lookup (multi-factor)
// ────────────────────────────────────────────────────────────────────
/**
 * Verifies applicationId + guardianMobile together.
 * Returns null (NOT an error) if no match — handler must respond with
 * generic error to prevent enumeration.
 */
export async function lookupStatus(
  applicationId: string,
  guardianMobile: string
): Promise<{
  status: AdmissionStatus;
  correctionNote: string;
  studentNameBn: string;
  studentNameEn: string;
  classApplyingFor: string;
  submittedAt: Date;
} | null> {
  const snap = await db
    .collection(COLLECTION)
    .where('applicationId', '==', applicationId)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data();

  if (data.guardian?.mobile !== guardianMobile) return null;

  return {
    status: data.status,
    correctionNote: data.correctionNote ?? '',
    studentNameBn: data.student?.nameBn ?? '',
    studentNameEn: data.student?.nameEn ?? '',
    classApplyingFor: data.student?.classApplyingFor ?? '',
    submittedAt: (data.createdAt as any)?.toDate?.() ?? new Date(),
  };
}

// ────────────────────────────────────────────────────────────────────
// Admin: get by document id
// ────────────────────────────────────────────────────────────────────
export async function getApplicationById(
  id: string
): Promise<ApplicationRecord | null> {
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  return {
    id: snap.id,
    applicationId: d.applicationId,
    sessionId: d.sessionId,
    student: d.student ?? {},
    guardian: d.guardian ?? {},
    documents: d.documents ?? {},
    status: d.status,
    correctionNote: d.correctionNote ?? '',
    createdAt: (d.createdAt as any)?.toDate?.() ?? new Date(),
    updatedAt: (d.updatedAt as any)?.toDate?.() ?? new Date(),
  };
}

// ────────────────────────────────────────────────────────────────────
// Admin: list (with filters + pagination)
// ────────────────────────────────────────────────────────────────────
export interface ListFilters {
  status?: AdmissionStatus;
  classApplyingFor?: string;
  sessionId?: string;
  page: number;
  pageSize: number;
}

export async function listApplications(filters: ListFilters): Promise<{
  items: ApplicationRecord[];
  total: number;
  page: number;
  pageSize: number;
}> {
  let query: FirebaseFirestore.Query = db.collection(COLLECTION);

  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }
  if (filters.sessionId) {
    query = query.where('sessionId', '==', filters.sessionId);
  }
  if (filters.classApplyingFor) {
    query = query.where('student.classApplyingFor', '==', filters.classApplyingFor);
  }

  // Count total (expensive — consider aggregation in future)
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  const items = await query
    .orderBy('createdAt', 'desc')
    .offset((filters.page - 1) * filters.pageSize)
    .limit(filters.pageSize)
    .get();

  return {
    items: items.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        applicationId: d.applicationId,
        sessionId: d.sessionId,
        student: d.student ?? {},
        guardian: d.guardian ?? {},
        documents: d.documents ?? {},
        status: d.status,
        correctionNote: d.correctionNote ?? '',
        createdAt: (d.createdAt as any)?.toDate?.() ?? new Date(),
        updatedAt: (d.updatedAt as any)?.toDate?.() ?? new Date(),
      };
    }),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

// ────────────────────────────────────────────────────────────────────
// Admin: update status
// ────────────────────────────────────────────────────────────────────
export async function updateStatus(
  id: string,
  status: AdmissionStatus,
  note: string,
  by: string
): Promise<void> {
  const ref = db.collection(COLLECTION).doc(id);

  await ref.update({
    status,
    correctionNote: status === 'correction_needed' ? note : '',
    statusHistory: FieldValue.arrayUnion({
      status,
      note,
      by,
      at: Timestamp.now(),
    }),
    updatedAt: FieldValue.serverTimestamp(),
  });
                }
