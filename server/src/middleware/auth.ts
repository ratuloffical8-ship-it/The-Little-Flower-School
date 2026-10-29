// server/src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

// ── Extend Express Request ──────────────────────────────────────────
export interface AuthUser {
  uid: string;
  email: string | null;
  role: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ── Valid admin roles ───────────────────────────────────────────────
export const ADMIN_ROLES = [
  'super_admin',
  'school_admin',
  'accountant',
  'teacher',
  'admission_officer',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

// ── Verify Firebase ID Token ────────────────────────────────────────
/**
 * Extracts and verifies the Firebase ID token from the Authorization header.
 * Attaches `req.user` with uid, email, and role from custom claims.
 * Returns 401 if token is missing or invalid.
 */
export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);

  try {
    const decoded = await auth.verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      role: (decoded.role as string) ?? null,
    };

    next();
  } catch (err: any) {
    // Provide specific messages for common errors in development
    const code = err?.errorInfo?.code ?? err?.code ?? '';

    if (code === 'auth/id-token-expired') {
      res.status(401).json({ error: 'Token expired. Please sign in again.' });
      return;
    }

    if (code === 'auth/argument-error') {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    res.status(401).json({ error: 'Unauthorized' });
  }
}

// ── Require Specific Role(s) ────────────────────────────────────────
/**
 * Checks that the authenticated user has one of the specified roles.
 * Must be used AFTER `verifyToken` in the middleware chain.
 *
 * Usage:
 *   router.get('/admin/data', verifyToken, requireRole('super_admin', 'school_admin'), handler);
 */
export function requireRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!req.user.role || !roles.includes(req.user.role as AdminRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

// ── Optional Auth (doesn't block if no token) ───────────────────────
/**
 * Attaches user info if a valid token is present, but doesn't block
 * unauthenticated requests. Useful for public endpoints that show
 * extra info to logged-in users.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = header.slice(7);
    const decoded = await auth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      role: (decoded.role as string) ?? null,
    };
  } catch {
    // Silently ignore invalid tokens for optional auth
  }

  next();
  }
