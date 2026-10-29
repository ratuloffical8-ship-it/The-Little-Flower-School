// server/src/services/notice.service.ts
import { db, FieldValue } from '../config/firebase';
import { deleteFile } from './storage.service';

/**
 * Notice service.
 *
 * Collection: `notices`
 * Document shape:
 *   {
 *     titleBn, titleEn, descriptionBn, descriptionEn,
 *     date (YYYY-MM-DD), important (bool), published (bool),
 *     pdfPath?: string, createdAt, updatedAt
 *   }
 */

const COLLECTION = 'notices';

export interface NoticeRecord {
  id: string;
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  date: string;
  important: boolean;
  published: boolean;
  pdfPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNoticeInput {
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  date: string;
  important: boolean;
  published: boolean;
  pdfPath?: string;
}

function toRecord(doc: FirebaseFirestore.QueryDocumentSnapshot): NoticeRecord {
  const d = doc.data();
  return {
    id: doc.id,
    titleBn: d.titleBn ?? '',
    titleEn: d.titleEn ?? '',
    descriptionBn: d.descriptionBn ?? '',
    descriptionEn: d.descriptionEn ?? '',
    date: d.date ?? '',
    important: d.important ?? false,
    published: d.published ?? false,
    pdfPath: d.pdfPath,
    createdAt: (d.createdAt as any)?.toDate?.() ?? new Date(),
    updatedAt: (d.updatedAt as any)?.toDate?.() ?? new Date(),
  };
}

// ── Public: list published notices (newest first) ───────────────────
export async function listPublishedNotices(): Promise<NoticeRecord[]> {
  const snap = await db
    .collection(COLLECTION)
    .where('published', '==', true)
    .orderBy('date', 'desc')
    .limit(100)
    .get();
  return snap.docs.map(toRecord);
}

// ── Public: get single notice by ID (only if published) ─────────────
export async function getPublishedNotice(id: string): Promise<NoticeRecord | null> {
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  if (!d.published) return null;
  return toRecord(snap as any);
}

// ── Admin: list all (with filters) ──────────────────────────────────
export async function listAllNotices(options: {
  published?: boolean;
  important?: boolean;
  page: number;
  pageSize: number;
}): Promise<{ items: NoticeRecord[]; total: number; page: number; pageSize: number }> {
  let query: FirebaseFirestore.Query = db.collection(COLLECTION);
  if (options.published !== undefined) {
    query = query.where('published', '==', options.published);
  }
  if (options.important !== undefined) {
    query = query.where('important', '==', options.important);
  }

  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  const snap = await query
    .orderBy('date', 'desc')
    .offset((options.page - 1) * options.pageSize)
    .limit(options.pageSize)
    .get();

  return {
    items: snap.docs.map(toRecord),
    total,
    page: options.page,
    pageSize: options.pageSize,
  };
}

// ── Admin: get by ID ────────────────────────────────────────────────
export async function getNoticeById(id: string): Promise<NoticeRecord | null> {
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return toRecord(snap as any);
}

// ── Admin: create ───────────────────────────────────────────────────
export async function createNotice(input: CreateNoticeInput): Promise<string> {
  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    ...input,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

// ── Admin: update ───────────────────────────────────────────────────
export async function updateNotice(
  id: string,
  updates: Partial<CreateNoticeInput>
): Promise<void> {
  await db.collection(COLLECTION).doc(id).update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ── Admin: delete (also removes PDF from storage) ───────────────────
export async function deleteNotice(id: string): Promise<void> {
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (snap.exists) {
    const pdfPath = snap.data()?.pdfPath as string | undefined;
    if (pdfPath) {
      await deleteFile(pdfPath).catch(() => undefined);
    }
    await snap.ref.delete();
  }
}
