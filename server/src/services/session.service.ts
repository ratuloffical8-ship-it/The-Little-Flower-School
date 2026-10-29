// server/src/services/session.service.ts
import { db } from '../config/firebase';

/**
 * Academic session (year) service.
 *
 * Collection: `sessions`
 * Document shape: { year: number, isActive: boolean, startDate?, endDate? }
 * Document ID = year as string (e.g. "2025")
 *
 * The "active" session is the one with isActive === true.
 * There should be exactly one active session at any time.
 */

const COLLECTION = 'sessions';

interface CachedSession {
  id: string;
  year: number;
  fetchedAt: number;
}

let cache: CachedSession | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns the currently active session ID (e.g. "2025").
 * Caches for 5 minutes to minimize Firestore reads.
 * Falls back to current calendar year if no active session exists.
 */
export async function getActiveSessionId(): Promise<string> {
  const now = Date.now();

  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.id;
  }

  try {
    const snap = await db
      .collection(COLLECTION)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();
      cache = {
        id: doc.id,
        year: data.year ?? parseInt(doc.id, 10),
        fetchedAt: now,
      };
      return cache.id;
    }
  } catch (err) {
    console.error('[SESSION] Failed to fetch active session:', err);
  }

  // Fallback: current year
  const fallback = String(new Date().getFullYear());
  cache = { id: fallback, year: new Date().getFullYear(), fetchedAt: now };
  return fallback;
}

/**
 * List all sessions ordered by year descending (admin use).
 */
export async function listSessions(): Promise<
  Array<{ id: string; year: number; isActive: boolean }>
> {
  const snap = await db.collection(COLLECTION).orderBy('year', 'desc').get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      year: d.year ?? parseInt(doc.id, 10),
      isActive: d.isActive ?? false,
    };
  });
}

/**
 * Set a session as active (deactivates all others).
 * Admin use only.
 */
export async function setActiveSession(sessionId: string): Promise<void> {
  const batch = db.batch();

  // Deactivate all
  const allSnap = await db.collection(COLLECTION).get();
  allSnap.docs.forEach((doc) => {
    batch.update(doc.ref, { isActive: false });
  });

  // Activate target
  const targetRef = db.collection(COLLECTION).doc(sessionId);
  batch.set(targetRef, { isActive: true, year: parseInt(sessionId, 10) }, { merge: true });

  await batch.commit();
  invalidateCache();
}

/** Invalidate the in-memory cache (call after admin changes) */
export function invalidateCache(): void {
  cache = null;
    }
