// server/src/services/settings.service.ts
import { db, FieldValue } from '../config/firebase';

/**
 * School settings service.
 *
 * Collection: `schoolSettings`
 * Single document with ID: "main"
 *
 * Contains all configurable school information:
 * name, address, contact, payment numbers, social links, etc.
 *
 * Public endpoint returns all fields (bKash/Nagad numbers are public).
 * Admin endpoint allows updating any field.
 */

const COLLECTION = 'schoolSettings';
const DOC_ID = 'main';

export interface SchoolSettings {
  schoolNameBn: string;
  schoolNameEn: string;
  establishedYear: number;
  address: string;
  phone: string;
  email: string;
  bkashNumber: string;
  nagadNumber: string;
  mapUrl: string;
  socialLinks: {
    facebook: string;
    youtube: string;
  };
  admissionOpen: boolean;
  heroImage: string;
  principalName: string;
  principalMessage: string;
}

const DEFAULT_SETTINGS: SchoolSettings = {
  schoolNameBn: 'দ্য লিটল ফ্লাওয়ার স্কুল',
  schoolNameEn: 'The Little Flower School',
  establishedYear: 2016,
  address: 'Editable sample content — replace with real address',
  phone: '01XXXXXXXXX',
  email: 'info@example.com',
  bkashNumber: '01XXXXXXXXX',
  nagadNumber: '01XXXXXXXXX',
  mapUrl: '',
  socialLinks: { facebook: '', youtube: '' },
  admissionOpen: true,
  heroImage: '',
  principalName: 'Editable sample content',
  principalMessage: 'Editable sample content',
};

/**
 * Get full settings (admin or public — all fields are safe to expose).
 */
export async function getSettings(): Promise<SchoolSettings> {
  const snap = await db.collection(COLLECTION).doc(DOC_ID).get();
  if (!snap.exists) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<SchoolSettings>) };
}

/**
 * Alias for getSettings — all fields are public-safe.
 */
export async function getPublicSettings(): Promise<SchoolSettings> {
  return getSettings();
}

/**
 * Update settings (admin use). Merges with existing document.
 */
export async function updateSettings(
  updates: Partial<SchoolSettings>
): Promise<SchoolSettings> {
  const ref = db.collection(COLLECTION).doc(DOC_ID);
  await ref.set(
    {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return getSettings();
}

/**
 * Initialize default settings if the document doesn't exist yet.
 * Called during bootstrap / first deploy.
 */
export async function ensureDefaultSettings(): Promise<void> {
  const ref = db.collection(COLLECTION).doc(DOC_ID);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      ...DEFAULT_SETTINGS,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('[SETTINGS] Created default school settings');
  }
}
