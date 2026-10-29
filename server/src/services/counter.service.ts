// server/src/services/counter.service.ts
import { db, FieldValue } from '../config/firebase';

/**
 * Atomic counter service for generating sequential IDs.
 *
 * Stores counters in Firestore collection: `counters`
 * Document ID format: `{type}_{year}`  (e.g. `admission_2025`, `student_2025`)
 * Field: `value` (number)
 *
 * Uses a Firestore transaction to guarantee monotonic increments
 * even under concurrent requests.
 */

const COLLECTION = 'counters';

type CounterType = 'admission' | 'student' | 'invoice' | 'payment';

interface GenerateOptions {
  type: CounterType;
  year?: number;
  /** Number of digits to pad to (default: 6 for admission, 4 for student) */
  pad?: number;
}

async function nextValue(docId: string): Promise<number> {
  const ref = db.collection(COLLECTION).doc(docId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? ((snap.data()?.value as number) ?? 0) : 0;
    const next = current + 1;

    if (snap.exists) {
      tx.update(ref, {
        value: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.set(ref, {
        value: next,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return next;
  });
}

/**
 * Generate the next ID for a given type and year.
 * Format: TLFS-{TYPE}-{YYYY}-{NNNNNN}
 *
 * Examples:
 *   generateId({ type: 'admission', year: 2025 }) → "TLFS-APP-2025-000001"
 *   generateId({ type: 'student',   year: 2025 }) → "TLFS-STU-2025-0001"
 */
export async function generateId(options: GenerateOptions): Promise<string> {
  const year = options.year ?? new Date().getFullYear();
  const docId = `${options.type}_${year}`;
  const value = await nextValue(docId);

  const prefixMap: Record<CounterType, string> = {
    admission: 'TLFS-APP',
    student: 'TLFS-STU',
    invoice: 'TLFS-INV',
    payment: 'TLFS-PAY',
  };

  const defaultPadMap: Record<CounterType, number> = {
    admission: 6,
    student: 4,
    invoice: 6,
    payment: 6,
  };

  const pad = options.pad ?? defaultPadMap[options.type];
  const padded = String(value).padStart(pad, '0');

  return `${prefixMap[options.type]}-${year}-${padded}`;
}

/**
 * Read-only peek — returns the current counter value without incrementing.
 * Returns 0 if the counter doesn't exist.
 */
export async function peekCounter(
  type: CounterType,
  year?: number
): Promise<number> {
  const y = year ?? new Date().getFullYear();
  const snap = await db.collection(COLLECTION).doc(`${type}_${y}`).get();
  if (!snap.exists) return 0;
  return (snap.data()?.value as number) ?? 0;
    }
