// server/src/scripts/seed.ts
/**
 * Idempotent reference-data seed: school classes (Play, Nursery, 1–10) and,
 * if no session is active yet, the current academic year as the active session.
 * Existing documents are never overwritten. No sample/fake data is created.
 *
 * Run from `server/`:
 *   npx tsx --env-file=.env src/scripts/seed.ts [--session 2026]
 */
import { db, FieldValue } from '../config/firebase';
import { todayBd } from '../services/report.service';

interface ClassSeed {
  id: string;
  nameBn: string;
  nameEn: string;
  order: number;
}

const CLASSES: ClassSeed[] = [
  { id: 'play', nameBn: 'প্লে', nameEn: 'Play', order: 0 },
  { id: 'nursery', nameBn: 'নার্সারি', nameEn: 'Nursery', order: 1 },
  { id: '1', nameBn: 'প্রথম শ্রেণি', nameEn: 'Class 1', order: 2 },
  { id: '2', nameBn: 'দ্বিতীয় শ্রেণি', nameEn: 'Class 2', order: 3 },
  { id: '3', nameBn: 'তৃতীয় শ্রেণি', nameEn: 'Class 3', order: 4 },
  { id: '4', nameBn: 'চতুর্থ শ্রেণি', nameEn: 'Class 4', order: 5 },
  { id: '5', nameBn: 'পঞ্চম শ্রেণি', nameEn: 'Class 5', order: 6 },
  { id: '6', nameBn: 'ষষ্ঠ শ্রেণি', nameEn: 'Class 6', order: 7 },
  { id: '7', nameBn: 'সপ্তম শ্রেণি', nameEn: 'Class 7', order: 8 },
  { id: '8', nameBn: 'অষ্টম শ্রেণি', nameEn: 'Class 8', order: 9 },
  { id: '9', nameBn: 'নবম শ্রেণি', nameEn: 'Class 9', order: 10 },
  { id: '10', nameBn: 'দশম শ্রেণি', nameEn: 'Class 10', order: 11 },
];

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1) {
    const next = process.argv[idx + 1];
    return next && !next.startsWith('--') ? next : undefined;
  }
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function seedClasses(): Promise<number> {
  const col = db.collection('schoolClasses');
  const refs = CLASSES.map((c) => col.doc(c.id));
  const snaps = await db.getAll(...refs);

  const batch = db.batch();
  let created = 0;
  snaps.forEach((snap, i) => {
    if (snap.exists) return;
    batch.set(refs[i], {
      ...CLASSES[i],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    created += 1;
  });
  if (created > 0) await batch.commit();
  return created;
}

async function seedSession(yearArg?: string): Promise<string> {
  const col = db.collection('sessions');

  const active = await col.where('isActive', '==', true).limit(1).get();
  if (!active.empty) {
    return `kept existing active session ${active.docs[0].id}`;
  }

  const year = (yearArg ?? todayBd().slice(0, 4)).trim();
  if (!/^\d{4}$/.test(year)) throw new Error('--session must be a 4-digit year, e.g. 2026');

  const ref = col.doc(year);
  const snap = await ref.get();
  await ref.set(
    {
      year: Number(year),
      isActive: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  return `${snap.exists ? 'activated' : 'created and activated'} session ${year}`;
}

async function main(): Promise<void> {
  const classesCreated = await seedClasses();
  console.log(`[seed] schoolClasses: ${classesCreated} created, ${CLASSES.length - classesCreated} already present`);

  const sessionResult = await seedSession(arg('session'));
  console.log(`[seed] sessions: ${sessionResult}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] Failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
