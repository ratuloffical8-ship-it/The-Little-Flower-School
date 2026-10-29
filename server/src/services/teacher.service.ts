// server/src/services/teacher.service.ts
import { db, FieldValue, Timestamp } from '../config/firebase';
import { notFound } from '../utils/errors';

const COL = 'teachers';

export interface TeacherRecord {
  id: string;
  name: string;
  designation: string;
  subject: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTeacherInput {
  name: string;
  designation: string;
  subject: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

export type UpdateTeacherInput = Partial<CreateTeacherInput>;

const iso = (v: unknown): string | undefined =>
  v instanceof Timestamp ? v.toDate().toISOString() : (v as string | undefined);

function toRecord(doc: FirebaseFirestore.DocumentSnapshot): TeacherRecord {
  const data = doc.data() ?? {};
  return {
    ...data,
    id: doc.id,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  } as TeacherRecord;
}

export async function listTeachers(isActive?: boolean): Promise<TeacherRecord[]> {
  let q: FirebaseFirestore.Query = db.collection(COL);
  if (isActive !== undefined) q = q.where('isActive', '==', isActive);
  const snap = await q.orderBy('name').limit(500).get();
  return snap.docs.map(toRecord);
}

export async function getTeacherById(id: string): Promise<TeacherRecord | null> {
  const doc = await db.collection(COL).doc(id).get();
  return doc.exists ? toRecord(doc) : null;
}

export async function createTeacher(input: CreateTeacherInput): Promise<TeacherRecord> {
  const ref = db.collection(COL).doc();
  await ref.set({
    name: input.name,
    designation: input.designation,
    subject: input.subject,
    phone: input.phone ?? '',
    email: input.email ?? '',
    isActive: input.isActive ?? true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return (await getTeacherById(ref.id)) as TeacherRecord;
}

export async function updateTeacher(id: string, updates: UpdateTeacherInput): Promise<TeacherRecord> {
  const ref = db.collection(COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw notFound('Teacher not found');

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) patch[k] = v;
  }

  await ref.update(patch);
  return (await getTeacherById(id)) as TeacherRecord;
}

export async function deleteTeacher(id: string): Promise<void> {
  const ref = db.collection(COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw notFound('Teacher not found');
  await ref.delete();
    }
