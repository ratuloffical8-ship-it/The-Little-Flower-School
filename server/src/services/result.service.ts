// server/src/services/result.service.ts
import { db, FieldValue } from '../config/firebase';
import { badRequest, notFound } from '../utils/errors';
import { computeResult, type SubjectResult } from '../utils/grading';
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
  roll: string | number;
  /** Guardian mobile number */
  mobile: string;
}

export interface PublicResult {
  exam: { id: string; name: string };
  student: { studentId: string; name: string; classId: string; roll?: string | number };
  subjects: SubjectResult[];
  total: number;
  fullTotal: number;
  percentage: number;
  gpa: number;
  grade: string;
  passed: boolean;
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

    return { studentId: entry.studentId, computed: computeResult(inputs) };
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
      return { id: d.id, ...data, studentName: info?.name, roll: info?.roll };
    })
    .sort((a, b) => a.studentId.localeCompare(b.studentId));
}

export async function getResult(examId: string, studentId: string): Promise<ResultRecord | null> {
  const doc = await db.collection(RESULTS_COLLECTION).doc(resultDocId(examId, studentId)).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<ResultRecord, 'id'>) };
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

  const rollNum = Number(String(input.roll).replace(/\D/g, ''));
  const given = normalizeMobile(input.mobile);
  if (!Number.isFinite(rollNum) || rollNum < 1 || !given) throw notFound(GENERIC_MISMATCH);

  // Equality-only query: no composite index required
  const snap = await db.collection(STUDENTS_COLLECTION).where('classId', '==', exam.classId).get();
  const doc = snap.docs.find((d) => {
    const x = d.data();
    const sameRoll = Number(x.roll ?? x.rollNumber) === rollNum;
    const sameSession = !exam.sessionId || !x.sessionId || x.sessionId === exam.sessionId;
    return (
      sameRoll &&
      sameSession &&
      x.isActive !== false &&
      normalizeMobile((x.guardian as { mobile?: unknown } | undefined)?.mobile) === given
    );
  });
  if (!doc) throw notFound(GENERIC_MISMATCH);

  const student = doc.data();
  const resolvedStudentId = String(student.studentId ?? doc.id);
  const result = await getResult(exam.id, resolvedStudentId);
  if (!result) throw notFound(GENERIC_MISMATCH);

  return {
    exam: { id: exam.id, name: exam.name },
    student: {
      studentId: resolvedStudentId,
      name: String(student.name ?? student.nameBn ?? student.nameEn ?? ''),
      classId: String(student.classId ?? exam.classId),
      roll: (student.roll ?? student.rollNumber) as string | number | undefined,
    },
    subjects: result.subjects,
    total: result.total,
    fullTotal: result.fullTotal,
    percentage: result.percentage,
    gpa: result.gpa,
    grade: result.grade,
    passed: result.passed,
  };
    }
