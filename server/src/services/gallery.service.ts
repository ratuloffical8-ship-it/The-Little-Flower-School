// server/src/services/gallery.service.ts
import { db, FieldValue } from '../config/firebase';
import { deleteFile, getSignedUrl } from './storage.service';

/**
 * Gallery service.
 *
 * Collection: `gallery`
 * Document shape:
 *   {
 *     imagePath: string (Firebase Storage path),
 *     captionBn, captionEn,
 *     category: string,
 *     published: boolean,
 *     order: number,
 *     createdAt, updatedAt
 *   }
 *
 * Images are PRIVATE in Storage. Signed URLs are generated on-demand.
 */

const COLLECTION = 'gallery';

export interface GalleryRecord {
  id: string;
  imagePath: string;
  imageUrl?: string; // populated signed URL (not stored in Firestore)
  captionBn: string;
  captionEn: string;
  category: string;
  published: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGalleryInput {
  imagePath: string;
  captionBn: string;
  captionEn: string;
  category: string;
  published: boolean;
  order?: number;
}

function toRecord(doc: FirebaseFirestore.QueryDocumentSnapshot): GalleryRecord {
  const d = doc.data();
  return {
    id: doc.id,
    imagePath: d.imagePath ?? '',
    captionBn: d.captionBn ?? '',
    captionEn: d.captionEn ?? '',
    category: d.category ?? 'general',
    published: d.published ?? false,
    order: d.order ?? 0,
    createdAt: (d.createdAt as any)?.toDate?.() ?? new Date(),
    updatedAt: (d.updatedAt as any)?.toDate?.() ?? new Date(),
  };
}

/**
 * Attach signed URLs to a list of records.
 * URL expiry: 1 hour (longer than default to reduce re-requests).
 */
async function attachSignedUrls(records: GalleryRecord[]): Promise<GalleryRecord[]> {
  return Promise.all(
    records.map(async (r) => {
      if (!r.imagePath) return r;
      try {
        const url = await getSignedUrl(r.imagePath, 60);
        return { ...r, imageUrl: url };
      } catch {
        return r;
      }
    })
  );
}

// ── Public: list published (optionally filtered by category) ────────
export async function listPublishedGallery(category?: string): Promise<GalleryRecord[]> {
  let query: FirebaseFirestore.Query = db
    .collection(COLLECTION)
    .where('published', '==', true);

  if (category && category !== 'all') {
    query = query.where('category', '==', category);
  }

  const snap = await query.orderBy('order', 'asc').limit(200).get();
  const records = snap.docs.map(toRecord);
  return attachSignedUrls(records);
}

// ── Public: list distinct categories (from published items) ─────────
export async function listCategories(): Promise<string[]> {
  const snap = await db
    .collection(COLLECTION)
    .where('published', '==', true)
    .select('category')
    .get();
  const set = new Set<string>();
  snap.docs.forEach((d) => {
    const c = d.data().category;
    if (typeof c === 'string' && c.length > 0) set.add(c);
  });
  return Array.from(set).sort();
}

// ── Admin: list all ─────────────────────────────────────────────────
export async function listAllGallery(options: {
  category?: string;
  published?: boolean;
  page: number;
  pageSize: number;
}): Promise<{ items: GalleryRecord[]; total: number; page: number; pageSize: number }> {
  let query: FirebaseFirestore.Query = db.collection(COLLECTION);
  if (options.category) query = query.where('category', '==', options.category);
  if (options.published !== undefined) query = query.where('published', '==', options.published);

  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  const snap = await query
    .orderBy('order', 'asc')
    .offset((options.page - 1) * options.pageSize)
    .limit(options.pageSize)
    .get();

  const records = snap.docs.map(toRecord);
  const withUrls = await attachSignedUrls(records);
  return { items: withUrls, total, page: options.page, pageSize: options.pageSize };
}

// ── Admin: create ───────────────────────────────────────────────────
export async function createGalleryItem(input: CreateGalleryInput): Promise<string> {
  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    imagePath: input.imagePath,
    captionBn: input.captionBn,
    captionEn: input.captionEn,
    category: input.category,
    published: input.published,
    order: input.order ?? 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

// ── Admin: update ───────────────────────────────────────────────────
export async function updateGalleryItem(
  id: string,
  updates: Partial<CreateGalleryInput>
): Promise<void> {
  await db.collection(COLLECTION).doc(id).update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ── Admin: delete (also removes image from storage) ─────────────────
export async function deleteGalleryItem(id: string): Promise<void> {
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (snap.exists) {
    const imagePath = snap.data()?.imagePath as string | undefined;
    if (imagePath) {
      await deleteFile(imagePath).catch(() => undefined);
    }
    await snap.ref.delete();
  }
}
