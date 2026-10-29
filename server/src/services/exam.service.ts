// server/src/services/exam.service.ts
import { db, FieldValue } from '../config/firebase';
import { badRequest, notFound } from '../utils/errors';

export const EXAMS_COLLECTION = 'exams';
// Literal (not imported from result.service) to avoid a circular import
const RESULTS_COLLECTION = 'results';

export interface ExamSubject {
  name: string;
  fullMarks: number;
  passMarks: number;
  isOptional: boolean;
}

export interface ExamRecord {
  id: string;
  name: string;
  classId: string;
  sessionId: string;
  subjects: ExamSubject[];
  published: boolean;
  publishedAt?: unknown;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PublicExam {
  id: string;
  name: string;
  classId: string;
  sessionId: string;
}

export interface CreateExamInput {
  name: string;
  classId: string;
  sessionId: string;
  subjects: ExamSubject[];
}

export interface UpdateExamInput {
  name?: string;
  subjects?: ExamSubject[];
}

export interface ListExamsParams {
  classId?: string;
  sessionId?: string;
  published?: boolean;
}

function millis(v: unknown): number {
  const t = v as { toMillis?: () => number } | undefined;
  return typeof t?.toMillis === 'function' ? t.toMillis() : 0;
}

function assertValidSubjects(subjects: ExamSubject[]): void {
  if (subjects.length === 0) throw badRequest('At least one subject is required');
  const names = new Set<string>();
  for (const s of subjects) {
    const key = s.name.trim().toLowerCase();
    if (names.has(key)) throw badRequest(`Duplicate subject name: ${s.name}`);
    names.add(key);
    if (!(s.fullMarks > 0)) throw badRequest(`Full marks must be positive: ${s.name}`);
    if (s.passMarks < 0 || s.passMarks > s.fullMarks) {
      throw badRequest(`Pass marks must be between 0 and full marks: ${s.name}`);
    }
  }
  if (!subjects.some((s) => !s.isOptional)) {
    throw badRequest('At least one compulsory (non-optional) subject is required');
  }
}

async function hasResults(examId: string): Promise<boolean> {
  const snap = await db
    .collection(RESULTS_COLLECTION)
    .where('examId', '==', examId)
    .limit(1)
    .get();
  return !snap.empty;
}

export async function getExamById(id: string): Promise<ExamRecord | null> {
  const doc = await db.collection(EXAMS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<ExamRecord, 'id'>) };
}

export async function listExams(params: ListExamsParams = {}): Promise<ExamRecord[]> {
  let q: FirebaseFirestore.Query = db.collection(EXAMS_COLLECTION);
  if (params.classId) q = q.where('classId', '==', params.classId);
  if (params.sessionId) q = q.where('sessionId', '==', params.sessionId);
  if (params.published !== undefined) q = q.where('published', '==', params.published);

  // Sorted in memory: exam counts are small, and this avoids extra composite indexes
  const snap = await q.limit(200).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<ExamRecord, 'id'>) }))
    .sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
}

export async function listPublishedExams(): Promise<PublicExam[]> {
  const items = await listExams({ published: true });
  return items.map((e) => ({
    id: e.id,
    name: e.name,
    classId: e.classId,
    sessionId: e.sessionId,
  }));
}

export async function createExam(
  input: CreateExamInput,
  actorUid: string,
): Promise<ExamRecord> {
  assertValidSubjects(input.subjects);
  const ref = db.collection(EXAMS_COLLECTION).doc();
  await ref.set({
    name: input.name,
    classId: input.classId,
    sessionId: input.sessionId,
    subjects: input.subjects,
    published: false,
    createdBy: actorUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const created = await getExamById(ref.id);
  if (!created) throw notFound('Exam not found');
  return created;
}

export async function updateExam(id: string, updates: UpdateExamInput): Promise<ExamRecord> {
  const existing = await getExamById(id);
  if (!existing) throw notFound('Exam not found');

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.subjects !== undefined) {
    assertValidSubjects(updates.subjects);
    if (await hasResults(id)) {
      throw badRequest('Cannot change subjects after results have been entered');
    }
    patch.subjects = updates.subjects;
  }

  await db.collection(EXAMS_COLLECTION).doc(id).update(patch);
  const updated = await getExamById(id);
  if (!updated) throw notFound('Exam not found');
  return updated;
}

export async function setExamPublished(id: string, published: boolean): Promise<ExamRecord> {
  const existing = await getExamById(id);
  if (!existing) throw notFound('Exam not found');

  if (published && !(await hasResults(id))) {
    throw badRequest('Cannot publish an exam with no results entered');
  }

  await db
    .collection(EXAMS_COLLECTION)
    .doc(id)
    .update({
      published,
      publishedAt: published ? FieldValue.serverTimestamp() : FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  const updated = await getExamById(id);
  if (!updated) throw notFound('Exam not found');
  return updated;
}

export async function deleteExam(id: string): Promise<void> {
  const existing = await getExamById(id);
  if (!existing) throw notFound('Exam not found');
  if (await hasResults(id)) {
    throw badRequest('Cannot delete an exam that has results');
  }
  await db.collection(EXAMS_COLLECTION).doc(id).delete();
    }
