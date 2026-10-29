// server/src/config/firebase.ts
import admin from 'firebase-admin';
import { env } from './env';

/**
 * Decode the base64-encoded service account JSON from the environment.
 * In Render, set FIREBASE_SERVICE_ACCOUNT_BASE64 to:
 *   base64(service-account-file.json)
 */
function getServiceAccount(): admin.ServiceAccount {
  try {
    const decoded = Buffer.from(
      env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      'base64'
    ).toString('utf-8');
    return JSON.parse(decoded) as admin.ServiceAccount;
  } catch (err) {
    console.error(
      '[FIREBASE] Failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64. ' +
        'Ensure the env var contains a valid base64-encoded service account JSON.'
    );
    throw err;
  }
}

// Initialize Firebase Admin SDK (singleton — safe to import multiple times)
if (!admin.apps.length) {
  const serviceAccount = getServiceAccount();

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
  });

  console.log(
    `[FIREBASE] Initialized for project: ${env.FIREBASE_PROJECT_ID}`
  );
}

// ── Export convenience references ───────────────────────────────────
export const db = admin.firestore();
export const storage = admin.storage();
export const auth = admin.auth();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;

// ── Firestore settings ──────────────────────────────────────────────
db.settings({ ignoreUndefinedProperties: true });
