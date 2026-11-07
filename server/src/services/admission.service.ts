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
  /** convenience alias of student.classApplyingFor (used by the admin screens) */
  classApplyingFor?: string;
  statusHistory?: Array<Record<string, unknown>>;
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
/** Strips non-digits and a leading 88 country prefix. */
function normMobile(v: unknown): string {
  const d = String(v ?? '').replace(/\D/g, '');
  return d.startsWith('88') && d.length === 13 ? d.slice(2) : d;
}

const isoOf = (v: unknown): string => {
  const t = v as { toDate?: () => Date } | undefined;
  return typeof t?.toDate === 'function' ? t.toDate().toISOString() : new Date().toISOString();
};

export interface PublicAdmissionForm {
  applicationId: string;
  studentId: string;
  sessionId: string;
  classId: string;
  roll: string | number | '';
  submittedAt: string;
  student: {
    nameBn: string;
    nameEn: string;
    dateOfBirth: string;
    gender: string;
    religion: string;
    nationality: string;
    bloodGroup: string;
    previousSchool: string;
    classApplyingFor: string;
  };
  guardian: {
    fatherName: string;
    motherName: string;
    guardianName: string;
    relationship: string;
    occupation: string;
    nid: string;
    mobile: string;
    email: string;
    presentAddress: string;
    permanentAddress: string;
    monthlyIncome: string;
  };
  photo: string;
}

/**
 * Verifies (applicationId OR studentId) + guardianMobile together.
 * Returns null (NOT an error) on any mismatch — handler must respond with a
 * generic error to prevent enumeration.
 */
export async function lookupStatus(
  identifier: string,
  guardianMobile: string
): Promise<{
  applicationId: string;
  studentId: string;
  status: AdmissionStatus;
  statusChangedAt: string;
  correctionNote: string;
  studentNameBn: string;
  studentNameEn: string;
  classApplyingFor: string;
  submittedAt: Date;
  form: PublicAdmissionForm;
} | null> {
  const id = identifier.trim().toUpperCase();
  let app: FirebaseFirestore.DocumentData | null = null;
  let stu: FirebaseFirestore.DocumentData | null = null;

  if (id.includes('-STU-')) {
    const direct = await db.collection('students').doc(id).get();
    if (direct.exists) stu = direct.data() ?? null;
    else {
      const q = await db.collection('students').where('studentId', '==', id).limit(1).get();
      stu = q.empty ? null : q.docs[0].data();
    }
    if (!stu) return null;
    if (stu.applicationId) {
      const q = await db
        .collection(COLLECTION)
        .where('applicationId', '==', String(stu.applicationId))
        .limit(1)
        .get();
      app = q.empty ? null : q.docs[0].data();
    }
  } else {
    const q = await db.collection(COLLECTION).where('applicationId', '==', id).limit(1).get();
    if (q.empty) return null;
    app = q.docs[0].data();
    const sq = await db.collection('students').where('applicationId', '==', id).limit(1).get();
    stu = sq.empty ? null : sq.docs[0].data();
  }

  const mobile = app?.guardian?.mobile ?? stu?.guardian?.mobile;
  if (!normMobile(mobile) || normMobile(mobile) !== normMobile(guardianMobile)) return null;

  const as = (app?.student ?? {}) as Record<string, any>;
  const ag = (app?.guardian ?? {}) as Record<string, any>;
  const sg = (stu?.guardian ?? {}) as Record<string, any>;
  const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

  const form: PublicAdmissionForm = {
    applicationId: str(app?.applicationId ?? stu?.applicationId),
    studentId: str(stu?.studentId),
    sessionId: str(stu?.sessionId ?? app?.sessionId),
    classId: str(stu?.classId ?? as.classApplyingFor),
    roll: stu?.roll ?? '',
    submittedAt: isoOf(app?.createdAt ?? stu?.createdAt),
    student: {
      nameBn: str(as.nameBn ?? stu?.nameBn ?? stu?.name),
      nameEn: str(as.nameEn ?? stu?.nameEn),
      dateOfBirth: str(as.dateOfBirth ?? stu?.dateOfBirth),
      gender: str(as.gender ?? stu?.gender),
      religion: str(as.religion ?? stu?.religion),
      nationality: str(as.nationality),
      bloodGroup: str(as.bloodGroup ?? stu?.bloodGroup),
      previousSchool: str(as.previousSchool),
      classApplyingFor: str(as.classApplyingFor ?? stu?.classId),
    },
    guardian: {
      fatherName: str(ag.fatherName ?? sg.fatherName),
      motherName: str(ag.motherName ?? sg.motherName),
      guardianName: str(ag.guardianName ?? sg.guardianName ?? sg.name),
      relationship: str(ag.relationship),
      occupation: str(ag.occupation),
      nid: str(ag.nid ?? sg.nid),
      mobile: str(ag.mobile ?? sg.mobile),
      email: str(ag.email ?? sg.email),
      presentAddress: str(ag.presentAddress ?? sg.presentAddress ?? sg.address),
      permanentAddress: str(ag.permanentAddress ?? sg.permanentAddress),
      monthlyIncome: str(ag.monthlyIncome),
    },
    photo: str(app?.documents?.photo ?? stu?.photo),
  };

  return {
    applicationId: form.applicationId,
    studentId: form.studentId,
    status: (app?.status ?? 'approved') as AdmissionStatus,
    statusChangedAt: isoOf(app?.updatedAt ?? stu?.updatedAt),
    correctionNote: app?.correctionNote ?? '',
    studentNameBn: form.student.nameBn,
    studentNameEn: form.student.nameEn,
    classApplyingFor: form.student.classApplyingFor,
    submittedAt: (app?.createdAt as any)?.toDate?.() ?? new Date(),
    form,
  };
}

/** Admin: the application behind a student (matched by its applicationId). */
export async function getApplicationByApplicationId(
  applicationId: string
): Promise<ApplicationRecord | null> {
  const q = await db
    .collection(COLLECTION)
    .where('applicationId', '==', applicationId)
    .limit(1)
    .get();
  return q.empty ? null : getApplicationById(q.docs[0].id);
}

// ────────────────────────────────────────────────────────────────────
// Admin: get by document id
// ────────────────────────────────────────────────────────────────────
/**
 * Adds the field names the admin screens read (name, relation, address, dob, ...)
 * next to the ones the public form stores, and turns Firestore timestamps into ISO strings.
 */
function decorate(rec: ApplicationRecord, rawHistory?: unknown): ApplicationRecord {
  const st = rec.student ?? {};
  const g = rec.guardian ?? {};
  const history = Array.isArray(rawHistory)
    ? rawHistory.map((h: any) => ({
        ...h,
        at: h?.at?.toDate ? h.at.toDate().toISOString() : h?.at,
      }))
    : undefined;
  return {
    ...rec,
    classApplyingFor: st.classApplyingFor ?? '',
    student: { ...st, dob: st.dob ?? st.dateOfBirth ?? '' },
    guardian: {
      ...g,
      name: g.name ?? (g.guardianName || g.fatherName || ''),
      relation: g.relation ?? g.relationship ?? '',
      address: g.address ?? g.presentAddress ?? '',
    },
    ...(history ? { statusHistory: history } : {}),
  };
}

export async function getApplicationById(
  id: string
): Promise<ApplicationRecord | null> {
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  return decorate(
    {
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
    },
    d.statusHistory,
  );
}

// ────────────────────────────────────────────────────────────────────
// Admin: list (with filters + pagination)
// ────────────────────────────────────────────────────────────────────
export interface ListFilters {
  search?: string;
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

  // Filter / search / sort / paginate in memory: no Firestore composite index needed
  // (a school has a few hundred applications per year, so this is cheap).
  const snap = await query.get();
  let all: ApplicationRecord[] = snap.docs.map((doc) => {
    const d = doc.data();
    return decorate({
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
    });
  });

  const q = (filters.search ?? '').trim().toLowerCase();
  if (q) {
    all = all.filter(
      (a) =>
        String(a.applicationId ?? '').toLowerCase().includes(q) ||
        String(a.student?.nameBn ?? '').toLowerCase().includes(q) ||
        String(a.student?.nameEn ?? '').toLowerCase().includes(q) ||
        String(a.guardian?.mobile ?? '').includes(q),
    );
  }

  all.sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime());
  const total = all.length;
  const start = (filters.page - 1) * filters.pageSize;

  return {
    items: all.slice(start, start + filters.pageSize),
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
