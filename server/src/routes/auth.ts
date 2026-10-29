// server/src/routes/auth.ts
import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { auth, db, FieldValue } from '../config/firebase';
import { env } from '../config/env';
import { logAudit } from '../services/audit.service';

const router = Router();

/**
 * POST /api/auth/verify
 *
 * Called by the frontend immediately after Firebase Auth client-side login.
 * Flow:
 *   1. Client logs in via Firebase Auth SDK (email/password)
 *   2. Client gets ID token and sends it in Authorization header
 *   3. verifyToken middleware validates the token and attaches req.user
 *   4. This handler checks the `users` collection for the UID
 *   5. If found → returns role + profile
 *   6. If not found → checks BOOTSTRAP_SUPER_ADMIN_EMAIL env var
 *      - Match → promotes to super_admin, sets custom claims, creates record
 *      - No match → returns 403 (not a registered admin)
 *
 * Response: { uid, email, role, name }
 */
router.post('/verify', verifyToken, async (req, res, next) => {
  try {
    const { uid, email } = req.user!;

    if (!email) {
      res.status(400).json({ error: 'Email address is required for admin access' });
      return;
    }

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      // ── Existing admin user ─────────────────────────────────────
      const data = userSnap.data()!;
      const role = data.role ?? 'teacher';
      const name = data.name ?? '';

      // Ensure custom claims are set (in case they were lost)
      const userRecord = await auth.getUser(uid);
      if (userRecord.customClaims?.role !== role) {
        await auth.setCustomUserClaims(uid, { role });
      }

      // Update last login timestamp
      await userRef.update({ lastLoginAt: FieldValue.serverTimestamp() });

      res.json({ uid, email, role, name });
      return;
    }

    // ── New user — check bootstrap ────────────────────────────────
    const isBootstrap =
      env.BOOTSTRAP_SUPER_ADMIN_EMAIL &&
      email.toLowerCase() === env.BOOTSTRAP_SUPER_ADMIN_EMAIL.toLowerCase();

    if (!isBootstrap) {
      res.status(403).json({
        error:
          'Your account is not registered as an admin. Contact the school administrator.',
      });
      return;
    }

    // ── Bootstrap: promote to super_admin ─────────────────────────
    const role = 'super_admin';
    const name = 'Super Admin';

    // Set Firebase Auth custom claims
    await auth.setCustomUserClaims(uid, { role });

    // Create user document
    await userRef.set({
      email,
      role,
      name,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    });

    await logAudit({
      actorUid: uid,
      actorEmail: email,
      action: 'auth.bootstrap_super_admin',
      targetCollection: 'users',
      targetId: uid,
      details: { email },
    });

    console.log(`[AUTH] ✓ Bootstrapped super_admin: ${email}`);

    res.json({ uid, email, role, name });
  } catch (err) {
    next(err);
  }
});

export default router;
