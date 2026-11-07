// server/src/services/result.service.ts
import { db, FieldValue } from '../config/firebase';
import { badRequest, notFound } from '../utils/errors';
import { computeResult, evaluateResult, type SubjectResult } from '../utils/grading';
import { getExamById } from './exam.service';
import { getStudentById, findStudentByStudentId } from './student.service';

export const RESULTS_COLLECTION = 'results';
const STUDENTS_COLLECTION = 'students';
const BATCH_LIMIT = 400;
const GENERIC_MISMATCH = 'তথ্য মেলেনি / Details do not match';

export interface ResultRecord {
  /** Doc ID = `${examId}_${studentId}` */
  id: string;
  examId: string;
  studentId: string;
  classId: string;
  sessionId: string;
  subjects: SubjectResult[];
  total: number;
  fullTotal: number;
  percentage: number;
  gpa: number;
  grade: string;
  passed: boolean;
  /** teacher / admin decision for non-core failures */
  decision?: 'promoted' | 'failed';
  decisionNote?: string;
  promoted?: boolean;
  coreFailed?: boolean;
  failedSubjects?: string[];
  needsDecision?: boolean;
  enteredBy: string;
  updatedAt?: unknown;
}

export interface ResultListItem extends ResultRecord {
  studentName?: string;
  roll?: string | number;
}

export interface ResultEntryInput {
  studentId: string;
  /** subject name -> marks; null = absent. Every exam subject must be present. */
  marks: Record<string, number | null>;
}

export interface LookupResultInput {
  examId: string;
  /** Class roll number (unique inside the exam's class) */
  roll?: string | number;
  /** Or the student ID (TLFS-STU-...) */
  studentId?: string;
  /** Guardian mobile number */
  mobile: string;
}

export interface PublicResult {
  exam: { id: string; name: string };
  student: {
    studentId: string;
    name: string;
    nameBn: string;
    nameEn: string;
    classId: string;
    sessionId: string;
    roll?: string | number;
    fatherName: string;
    motherName: string;
    address: string;
    dateOfBirth: string;
    gender: string;
    photo: string;
  };
  subjects: SubjectResult[];
  total: number;
  fullTotal: number;
  percentage: number;
  gpa: number;
  grade: string;
  passed: boolean;
  promoted: boolean;
}

/** Re-applies the pass rules to a stored result (also fixes results saved with the old rule). */
function withEval<T extends { subjects: SubjectResult[]; decision?: string }>(r: T): T & {
  passed: boolean;
  gpa: number;
  grade: string;
  promoted: boolean;
  coreFailed: boolean;
  failedSubjects: string[];
  needsDecision: boolean;
} {
  const ev = evaluateResult(r.subjects, r.decision);
  return { ...r, ...ev };
}

export const resultDocId = (examId: string, studentId: string): string =>
  `${examId}_${studentId}`;

/** Strips non-digits and a leading 88 / +88 country prefix */
function normalizeMobile(v: unknown): string {
  const digits = String(v ?? '').replace(/\D/g, '');
  return digits.startsWith('88') && digits.length === 13 ? digits.slice(2) : digits;
}

export async function saveResults(
  examId: string,
  entries: ResultEntryInput[],
  actorUid: string,
): Promise<{ saved: number }> {
  const exam = await getExamById(examId);
  if (!exam) throw notFound('Exam not found');

  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.studentId)) throw badRequest(`Duplicate student in request: ${e.studentId}`);
    seen.add(e.studentId);
  }

  const students = await Promise.all(entries.map((e) => getStudentById(e.studentId)));
  const existing = await Promise.all(entries.map((e) => getResult(examId, e.studentId)));
  const subjectNames = new Set(exam.subjects.map((s) => s.name));

  const docs = entries.map((entry, i) => {
    const student = students[i];
    if (!student || student.classId !== exam.classId) {
      throw badRequest(`Student not found in this exam's class: ${entry.studentId}`);
    }

    for (const key of Object.keys(entry.marks)) {
      if (!subjectNames.has(key)) {
        throw badRequest(`Unknown subject "${key}" for ${entry.studentId}`);
      }
    }

    const inputs = exam.subjects.map((subject) => {
      if (!(subject.name in entry.marks)) {
        throw badRequest(`Missing marks for "${subject.name}" (${entry.studentId}); use null for absent`);
      }
      const marks = entry.marks[subject.name];
      if (marks !== null && (marks < 0 || marks > subject.fullMarks)) {
        throw badRequest(
          `Marks for "${subject.name}" (${entry.studentId}) must be between 0 and ${subject.fullMarks}`,
        );
      }
      return {
        name: subject.name,
        fullMarks: subject.fullMarks,
        passMarks: subject.passMarks,
        isOptional: subject.isOptional,
        marks,
      };
    });

    const computed = computeResult(inputs);
    const decision = existing[i]?.decision;
    const ev = evaluateResult(computed.subjects, decision);
    return {
      studentId: entry.studentId,
      computed: {
        ...computed,
        passed: ev.passed,
        gpa: ev.gpa,
        grade: ev.grade,
        promoted: ev.promoted,
        coreFailed: ev.coreFailed,
        failedSubjects: ev.failedSubjects,
        needsDecision: ev.needsDecision,
      },
    };
  });

  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const d of docs.slice(i, i + BATCH_LIMIT)) {
      const ref = db.collection(RESULTS_COLLECTION).doc(resultDocId(examId, d.studentId));
      batch.set(
        ref,
        {
          examId,
          studentId: d.studentId,
          classId: exam.classId,
          sessionId: exam.sessionId,
          ...d.computed,
          enteredBy: actorUid,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();
  }

  return { saved: docs.length };
}

export async function listExamResults(examId: string): Promise<ResultListItem[]> {
  const exam = await getExamById(examId);
  if (!exam) throw notFound('Exam not found');

  const [resultsSnap, rosterSnap] = await Promise.all([
    db.collection(RESULTS_COLLECTION).where('examId', '==', examId).get(),
    db.collection(STUDENTS_COLLECTION).where('classId', '==', exam.classId).get(),
  ]);

  const roster = new Map<string, { name?: string; roll?: string | number }>();
  for (const d of rosterSnap.docs) {
    const data = d.data();
    roster.set((data.studentId as string | undefined) ?? d.id, {
      name: data.name as string | undefined,
      roll: data.roll as string | number | undefined,
    });
  }

  return resultsSnap.docs
    .map((d) => {
      const data = d.data() as Omit<ResultRecord, 'id'>;
      const info = roster.get(data.studentId);
      return { id: d.id, ...withEval(data), studentName: info?.name, roll: info?.roll };
    })
    .sort((a, b) => a.studentId.localeCompare(b.studentId));
}

export async function getResult(examId: string, studentId: string): Promise<ResultRecord | null> {
  const doc = await db.collection(RESULTS_COLLECTION).doc(resultDocId(examId, studentId)).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...withEval(doc.data() as Omit<ResultRecord, 'id'>) };
}

/** Teacher / admin decision for a student who failed only non-core subjects. */
export async function setResultDecision(
  examId: string,
  studentId: string,
  decision: 'promoted' | 'failed',
  note: string,
  actorUid: string,
): Promise<ResultRecord> {
  const result = await getResult(examId, studentId);
  if (!result) throw notFound('Result not found');
  if (result.coreFailed) {
    throw badRequest('বাংলা, ইংরেজি ও গণিতে পাস না করলে বিবেচনায় পাস দেওয়া যায় না।');
  }
  const ev = evaluateResult(result.subjects, decision);
  await db
    .collection(RESULTS_COLLECTION)
    .doc(resultDocId(examId, studentId))
    .update({
      decision,
      decisionNote: note,
      decisionBy: actorUid,
      passed: ev.passed,
      promoted: ev.promoted,
      needsDecision: ev.needsDecision,
      gpa: ev.gpa,
      grade: ev.grade,
      updatedAt: FieldValue.serverTimestamp(),
    });
  return (await getResult(examId, studentId)) as ResultRecord;
}

export async function deleteResult(examId: string, studentId: string): Promise<void> {
  const ref = db.collection(RESULTS_COLLECTION).doc(resultDocId(examId, studentId));
  const doc = await ref.get();
  if (!doc.exists) throw notFound('Result not found');
  await ref.delete();
}

/**
 * Public lookup. Multi-factor: exam + class roll + guardian mobile; exam must be published.
 * The exam decides the class, so a roll number is unique there.
 * Every failure path returns the same generic 404 to avoid leaking what exists.
 */
export async function lookupPublishedResult(input: LookupResultInput): Promise<PublicResult> {
  const exam = await getExamById(input.examId);
  if (!exam || !exam.published) throw notFound(GENERIC_MISMATCH);

  const given = normalizeMobile(input.mobile);
  if (!given) throw notFound(GENERIC_MISMATCH);

  const wantedId = String(input.studentId ?? '').trim().toUpperCase();
  const rollNum = Number(String(input.roll ?? '').replace(/\D/g, ''));
  if (!wantedId && !(Number.isFinite(rollNum) && rollNum >= 1)) throw notFound(GENERIC_MISMATCH);

  // Equality-only query: no composite index required
  const snap = await db.collection(STUDENTS_COLLECTION).where('classId', '==', exam.classId).get();
  const doc = snap.docs.find((d) => {
    const x = d.data();
    if (x.isActive === false) return false;
    const sameWho = wantedId
      ? String(x.studentId ?? d.id).toUpperCase() === wantedId
      : Number(x.roll ?? x.rollNumber) === rollNum &&
        (!exam.sessionId || !x.sessionId || x.sessionId === exam.sessionId);
    return (
      sameWho &&
      normalizeMobile((x.guardian as { mobile?: unknown } | undefined)?.mobile) === given
    );
  });
  if (!doc) throw notFound(GENERIC_MISMATCH);

  const student = doc.data();
  const g = (student.guardian ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));
  const resolvedStudentId = String(student.studentId ?? doc.id);
  const result = await getResult(exam.id, resolvedStudentId);
  if (!result) throw notFound(GENERIC_MISMATCH);

  return {
    exam: { id: exam.id, name: exam.name },
    student: {
      studentId: resolvedStudentId,
      name: String(student.name ?? student.nameBn ?? student.nameEn ?? ''),
      nameBn: str(student.nameBn ?? student.name),
      nameEn: str(student.nameEn),
      classId: String(student.classId ?? exam.classId),
      sessionId: str(student.sessionId ?? exam.sessionId),
      roll: (student.roll ?? student.rollNumber) as string | number | undefined,
      fatherName: str(g.fatherName),
      motherName: str(g.motherName),
      address: str(g.presentAddress ?? g.address),
      dateOfBirth: str(student.dateOfBirth),
      gender: str(student.gender),
      photo: str(student.photo),
    },
    subjects: result.subjects,
    total: result.total,
    fullTotal: result.fullTotal,
    percentage: result.percentage,
    gpa: result.gpa,
    grade: result.grade,
    passed: result.passed,
    promoted: !!result.promoted,
  };
  }
