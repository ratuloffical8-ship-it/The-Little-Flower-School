// server/src/services/faq.service.ts
import { db, FieldValue } from '../config/firebase';

/**
 * FAQ service.
 *
 * Collection: `faq`
 * Document shape:
 *   {
 *     questionBn, questionEn, answerBn, answerEn,
 *     published: boolean,
 *     order: number,
 *     createdAt, updatedAt
 *   }
 */

const COLLECTION = 'faq';

export interface FAQRecord {
  id: string;
  questionBn: string;
  questionEn: string;
  answerBn: string;
  answerEn: string;
  published: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFAQInput {
  questionBn: string;
  questionEn: string;
  answerBn: string;
  answerEn: string;
  published: boolean;
  order?: number;
}

function toRecord(doc: FirebaseFirestore.QueryDocumentSnapshot): FAQRecord {
  const d = doc.data();
  return {
    id: doc.id,
    questionBn: d.questionBn ?? '',
    questionEn: d.questionEn ?? '',
    answerBn: d.answerBn ?? '',
    answerEn: d.answerEn ?? '',
    published: d.published ?? false,
    order: d.order ?? 0,
    createdAt: (d.createdAt as any)?.toDate?.() ?? new Date(),
    updatedAt: (d.updatedAt as any)?.toDate?.() ?? new Date(),
  };
}

// ── Public: list published, ordered ─────────────────────────────────
export async function listPublishedFAQ(): Promise<FAQRecord[]> {
  const snap = await db
    .collection(COLLECTION)
    .where('published', '==', true)
    .orderBy('order', 'asc')
    .limit(100)
    .get();
  return snap.docs.map(toRecord);
}

// ── Admin: list all ─────────────────────────────────────────────────
export async function listAllFAQ(): Promise<FAQRecord[]> {
  const snap = await db.collection(COLLECTION).orderBy('order', 'asc').get();
  return snap.docs.map(toRecord);
}

// ── Admin: get by ID ────────────────────────────────────────────────
export async function getFAQById(id: string): Promise<FAQRecord | null> {
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return toRecord(snap as any);
}

// ── Admin: create ───────────────────────────────────────────────────
export async function createFAQ(input: CreateFAQInput): Promise<string> {
  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    ...input,
    order: input.order ?? 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

// ── Admin: update ───────────────────────────────────────────────────
export async function updateFAQ(id: string, updates: Partial<CreateFAQInput>): Promise<void> {
  await db.collection(COLLECTION).doc(id).update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ── Admin: delete ───────────────────────────────────────────────────
export async function deleteFAQ(id: string): Promise<void> {
  await db.collection(COLLECTION).doc(id).delete();
}

// ── Admin: reorder (batch update) ───────────────────────────────────
export async function reorderFAQ(ordering: Array<{ id: string; order: number }>): Promise<void> {
  const batch = db.batch();
  ordering.forEach(({ id, order }) => {
    const ref = db.collection(COLLECTION).doc(id);
    batch.update(ref, { order, updatedAt: FieldValue.serverTimestamp() });
  });
  await batch.commit();
}
