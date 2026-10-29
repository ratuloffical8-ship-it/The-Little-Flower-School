// server/src/services/student.service.ts
import { db, FieldValue, Timestamp } from '../config/firebase';
import { generateId } from './counter.service';
import { notFound } from '../utils/errors';

const COL = 'students';

export interface Guardian {
  name?: string;
  mobile?: string;
  [key: string]: unknown;
}

export interface StudentRecord {
  id: string;
  studentId: string;
  classId: string;
  sessionId: string;
  name: string;
  roll?: number;
  guardian: Guardian;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CreateStudentInput {
  name: string;
  classId: string;
  sessionId: string;
  roll?: number;
  guardian: Guardian;
}

export interface UpdateStudentInput {
  name?: string;
  classId?: string;
  roll?: number;
  guardian?: Guardian;
  isActive?: boolean;
}

export interface ListStudentsParams {
  classId?: string;
  sessionId?: string;
  isActive?: boolean;
  search?: string;
  page: number;
  pageSize: number;
}

const iso = (v: unknown): string | undefined =>
  v instanceof Timestamp ? v.toDate().toISOString() : (v as string | undefined);

function toRecord(doc: FirebaseFirestore.DocumentSnapshot): StudentRecord {
  const data = doc.data() ?? {};
  return {
    ...data,
    id: doc.id,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  } as StudentRecord;
}

export async function listStudents(
  params: ListStudentsParams
): Promise<{ items: StudentRecord[]; total: number; page: number; pageSize: number }> {
  const { classId, sessionId, isActive, search, page, pageSize } = params;

  let q: FirebaseFirestore.Query = db.collection(COL);
  if (classId) q = q.where('classId', '==', classId);
  if (sessionId) q = q.where('sessionId', '==', sessionId);
  if (isActive !== undefined) q = q.where('isActive', '==', isActive);
  if (search) {
    const s = search.toUpperCase();
    q = q.where('studentId', '>=', s).where('studentId', '<=', s + '\uf8ff');
  }
  q = q.orderBy('studentId');

  const total = (await q.count().get()).data().count;
  const snap = await q.offset((page - 1) * pageSize).limit(pageSize).get();

  return { items: snap.docs.map(toRecord), total, page, pageSize };
}

export async function getStudentById(id: string): Promise<StudentRecord | null> {
  const doc = await db.collection(COL).doc(id).get();
  return doc.exists ? toRecord(doc) : null;
}

/** Looks up by document ID first, then falls back to the `studentId` field. */
export async function findStudentByStudentId(studentId: string): Promise<StudentRecord | null> {
  const direct = await getStudentById(studentId);
  if (direct) return direct;
  const snap = await db.collection(COL).where('studentId', '==', studentId).limit(1).get();
  return snap.empty ? null : toRecord(snap.docs[0]);
}

export async function createStudent(input: CreateStudentInput): Promise<StudentRecord> {
  const studentId = String(await generateId('student'));
  await db
    .collection(COL)
    .doc(studentId)
    .set({
      studentId,
      name: input.name,
      classId: input.classId,
      sessionId: input.sessionId,
      ...(input.roll !== undefined ? { roll: input.roll } : {}),
      guardian: input.guardian,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  return (await getStudentById(studentId)) as StudentRecord;
}

export async function updateStudent(id: string, updates: UpdateStudentInput): Promise<StudentRecord> {
  const ref = db.collection(COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw notFound('Student not found');

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  const { guardian, ...rest } = updates;
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) patch[k] = v;
  }
  if (guardian) {
    for (const [k, v] of Object.entries(guardian)) {
      if (v !== undefined) patch[`guardian.${k}`] = v;
    }
  }

  await ref.update(patch);
  return (await getStudentById(id)) as StudentRecord;
}

/** Soft delete — students are referenced by attendance, results and payments. */
export async function deactivateStudent(id: string): Promise<void> {
  const ref = db.collection(COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw notFound('Student not found');
  await ref.update({ isActive: false, updatedAt: FieldValue.serverTimestamp() });
}
