// src/hooks/useAuth.ts
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { type User } from 'firebase/auth';
import {
  signIn as firebaseSignIn,
  signOut as firebaseSignOut,
  onAuthChange,
  getIdToken,
  resetPassword as firebaseResetPassword,
} from '@/lib/firebase/auth';
import { api, ApiRequestError } from '@/lib/api';
import type { AdminRole, AuthState } from '@/types/admin';

/* ── Context shape ── */

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ── Provider ── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    isAdmin: false,
    isLoading: true,
    error: null,
  });

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user: User | null) => {
      if (!user) {
        setState({
          user: null,
          role: null,
          isAdmin: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        // Get ID token result to read custom claims
        const tokenResult = await user.getIdTokenResult();
        const role = (tokenResult.claims.role as AdminRole) || null;
        const isAdmin = !!role;

        setState({
          user: {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || undefined,
            photoURL: user.photoURL || undefined,
          },
          role,
          isAdmin,
          isLoading: false,
          error: null,
        });
      } catch {
        // User is logged in but claims couldn't be read
        setState({
          user: {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || undefined,
            photoURL: user.photoURL || undefined,
          },
          role: null,
          isAdmin: false,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const user = await firebaseSignIn(email, password);

      // Verify admin status via backend (checks custom claims + active admins doc)
      await api.get('/api/auth/verify', { retries: 1 });

      // Force refresh token to get latest claims
      const tokenResult = await user.getIdTokenResult(true);
      const role = (tokenResult.claims.role as AdminRole) || null;

      if (!role) {
        await firebaseSignOut();
        setState({
          user: null,
          role: null,
          isAdmin: false,
          isLoading: false,
          error: 'আপনি অ্যাডমিন নন / You are not an admin',
        });
        return;
      }

      setState({
        user: {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
        },
        role,
        isAdmin: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      await firebaseSignOut().catch(() => {});

      let message = 'ইমেইল বা পাসওয়ার্ড ভুল / Invalid email or password';
      if (err instanceof ApiRequestError) {
        if (err.apiError.status === 403) {
          message = 'আপনি অ্যাডমিন নন / You are not an admin';
        } else if (err.apiError.message) {
          message = err.apiError.message;
        }
      }

      setState({
        user: null,
        role: null,
        isAdmin: false,
        isLoading: false,
        error: message,
      });
    }
  }, []);

  const logout = useCallback(async () => {
    await firebaseSignOut();
    setState({
      user: null,
      role: null,
      isAdmin: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await firebaseResetPassword(email);
  }, []);

  const hasPermission = useCallback(
    (_permission: string): boolean => {
      // Client-side permission check is UX-only.
      // Real enforcement happens on the backend.
      // This is a simple role-based check for UI visibility.
      if (!state.isAdmin || !state.role) return false;

      // Super admin has all permissions
      if (state.role === 'super_admin') return true;

      // For other roles, the backend enforces granular permissions.
      // On the frontend, we show/hide based on role presence.
      // Granular permission checks should be done via the backend.
      return true;
    },
    [state.isAdmin, state.role],
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        resetPassword,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ── Hook ── */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
