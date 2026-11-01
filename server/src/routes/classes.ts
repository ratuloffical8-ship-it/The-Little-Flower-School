// server/src/routes/classes.ts
import { Router } from 'express';
import { db, FieldValue } from '../config/firebase';

/**
 * GET /api/classes → { items: [{ id, nameBn, nameEn, order }] }
 * Public + read-only. If the collection is empty it is filled once with
 * Play, Nursery and Class 1–10 (so no manual seed script is needed on Render free).
 */
const router = Router();

const DEFAULT_CLASSES = [
  { id: 'play', nameBn: 'প্লে', nameEn: 'Play' },
  { id: 'nursery', nameBn: 'নার্সারি', nameEn: 'Nursery' },
  { id: '1', nameBn: 'প্রথম শ্রেণি', nameEn: 'Class 1' },
  { id: '2', nameBn: 'দ্বিতীয় শ্রেণি', nameEn: 'Class 2' },
  { id: '3', nameBn: 'তৃতীয় শ্রেণি', nameEn: 'Class 3' },
  { id: '4', nameBn: 'চতুর্থ শ্রেণি', nameEn: 'Class 4' },
  { id: '5', nameBn: 'পঞ্চম শ্রেণি', nameEn: 'Class 5' },
  { id: '6', nameBn: 'ষষ্ঠ শ্রেণি', nameEn: 'Class 6' },
  { id: '7', nameBn: 'সপ্তম শ্রেণি', nameEn: 'Class 7' },
  { id: '8', nameBn: 'অষ্টম শ্রেণি', nameEn: 'Class 8' },
  { id: '9', nameBn: 'নবম শ্রেণি', nameEn: 'Class 9' },
  { id: '10', nameBn: 'দশম শ্রেণি', nameEn: 'Class 10' },
].map((c, order) => ({ ...c, order }));

async function ensureSeeded(): Promise<void> {
  const col = db.collection('schoolClasses');
  const existing = await col.limit(1).get();
  if (!existing.empty) return;
  const batch = db.batch();
  for (const c of DEFAULT_CLASSES) {
    batch.set(col.doc(c.id), {
      ...c,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}

router.get('/', async (_req, res, next) => {
  try {
    await ensureSeeded();
    const snap = await db.collection('schoolClasses').get();
    const items = snap.docs
      .map((d) => {
        const x = d.data();
        return {
          id: d.id,
          nameBn: String(x.nameBn ?? d.id),
          nameEn: String(x.nameEn ?? d.id),
          order: Number(x.order ?? 0),
        };
      })
      .sort((a, b) => a.order - b.order);
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

export default router;
