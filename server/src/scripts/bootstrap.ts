// server/src/scripts/bootstrap.ts
/**
 * One-off, idempotent setup: creates (or promotes) the first super_admin and
 * makes sure default school settings exist.
 *
 * Run from `server/` (env vars loaded from a local .env file):
 *   BOOTSTRAP_SUPER_ADMIN_PASSWORD='min-8-chars' \
 *     npx tsx --env-file=.env src/scripts/bootstrap.ts --email admin@example.com --name "Admin"
 *
 * - Email: --email, or BOOTSTRAP_SUPER_ADMIN_EMAIL.
 * - Password is only needed when the Firebase Auth user does not exist yet
 *   (read from BOOTSTRAP_SUPER_ADMIN_PASSWORD; never passed as an argument).
 * - If the user already exists it is promoted to super_admin and re-enabled.
 */
import type { UserRecord } from 'firebase-admin/auth';
import { auth, db, FieldValue } from '../config/firebase';
import { ensureDefaultSettings } from '../services/settings.service';
import { logAudit } from '../services/audit.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

async function main(): Promise<void> {
  const email = (arg('email') ?? process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new Error('A valid email is required (--email or BOOTSTRAP_SUPER_ADMIN_EMAIL).');
  }
  const name = arg('name')?.trim() || undefined;

  let user: UserRecord | undefined;
  let created = false;

  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
  }

  if (!user) {
    const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD ?? '';
    if (password.length < 8) {
      throw new Error(
        'No Firebase Auth user exists for this email. Set BOOTSTRAP_SUPER_ADMIN_PASSWORD (min 8 chars) to create one.',
      );
    }
    user = await auth.createUser({
      email,
      password,
      displayName: name ?? 'Super Admin',
      disabled: false,
    });
    created = true;
  } else if (user.disabled || (name && user.displayName !== name)) {
    user = await auth.updateUser(user.uid, {
      disabled: false,
      ...(name ? { displayName: name } : {}),
    });
  }

  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: 'super_admin' });
  if (!created) await auth.revokeRefreshTokens(user.uid); // force re-login so the new claim applies

  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  await ref.set(
    {
      uid: user.uid,
      email,
      name: user.displayName || name || 'Super Admin',
      role: 'super_admin',
      isActive: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp(), createdBy: 'bootstrap' }),
    },
    { merge: true },
  );

  await ensureDefaultSettings();

  await logAudit({
    actorUid: 'bootstrap-script',
    action: 'bootstrap.super_admin',
    targetCollection: 'users',
    targetId: user.uid,
  });

  console.log(
    `[bootstrap] ${created ? 'Created' : 'Promoted'} super_admin: ${email} (uid ${user.uid}). Default settings ensured.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[bootstrap] Failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
