// server/src/services/audit.service.ts
import { db, FieldValue } from '../config/firebase';

/**
 * Audit log service.
 *
 * Collection: `auditLogs`
 * Documents are append-only (never updated or deleted).
 *
 * Every admin write operation should call `logAudit()` so there
 * is a full trail of who changed what and when.
 */

const COLLECTION = 'auditLogs';

export interface AuditEntry {
  /** UID of the admin user performing the action */
  actorUid: string;
  /** Email of the admin user (optional) */
  actorEmail?: string;
  /** Dot-notation action name, e.g. 'admission.approve', 'student.delete' */
  action: string;
  /** Firestore collection being modified */
  targetCollection: string;
  /** Document ID being modified */
  targetId: string;
  /** Optional extra details (stored as-is in Firestore) */
  details?: Record<string, unknown>;
}

/**
 * Write an audit log entry.
 * Failures are logged to console but NEVER throw — audit logging
 * must not break the primary operation.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.collection(COLLECTION).add({
      actorUid: entry.actorUid,
      actorEmail: entry.actorEmail ?? '',
      action: entry.action,
      targetCollection: entry.targetCollection,
      targetId: entry.targetId,
      details: entry.details ?? {},
      at: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[AUDIT] Failed to write log:', err);
  }
}

/**
 * Query audit logs (admin use — super_admin only).
 */
export async function queryAuditLogs(options: {
  targetCollection?: string;
  targetId?: string;
  actorUid?: string;
  limit?: number;
}): Promise<Array<Record<string, unknown>>> {
  let query: FirebaseFirestore.Query = db.collection(COLLECTION);

  if (options.targetCollection) {
    query = query.where('targetCollection', '==', options.targetCollection);
  }
  if (options.targetId) {
    query = query.where('targetId', '==', options.targetId);
  }
  if (options.actorUid) {
    query = query.where('actorUid', '==', options.actorUid);
  }

  // Sort in memory: no Firestore composite index needed.
  const snap = await query.get();
  const millis = (v: unknown): number => (v as { toMillis?: () => number })?.toMillis?.() ?? 0;
  return snap.docs
    .sort((a, b) => millis(b.data().at) - millis(a.data().at))
    .slice(0, options.limit ?? 50)
    .map((doc) => ({ id: doc.id, ...doc.data() }));
      }
