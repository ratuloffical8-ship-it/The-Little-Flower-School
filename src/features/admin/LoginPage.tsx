// src/features/admin/LoginPage.tsx

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';

const ADMIN_HOME = '/admine';

interface LocationState {
  from?: { pathname?: string };
}

/** Only allow redirects back into the admin area (prevents open-redirect via router state). */
function safeDestination(state: unknown): string {
  const from = (state as LocationState | null)?.from?.pathname;
  if (typeof from === 'string' && from.startsWith('/admine') && !from.startsWith('/admine/login')) {
    return from;
  }
  return ADMIN_HOME;
}

export default function LoginPage() {
  const { user, isAdmin, isLoading, login, logout } = useAuth();
  const { isBengali, setLocale } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const destination = safeDestination(location.state);

  // Already signed in as an admin (or just finished signing in): go to the panel.
  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      navigate(destination, { replace: true });
    }
  }, [isLoading, user, isAdmin, destination, navigate]);

  // Signed in with Firebase but the account has no admin role.
  const noAccess = attempted && !isLoading && !!user && !isAdmin;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(tr('ইমেইল ও পাসওয়ার্ড দিন।', 'Enter your email and password.'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await login(trimmedEmail, password);
      setAttempted(true);
    } catch {
      // One generic message for every failure: never reveal whether the email exists.
      setError(
        tr(
          'ইমেইল বা পাসওয়ার্ড ঠিক নয়। আবার চেষ্টা করুন।',
          'Email or password is incorrect. Please try again.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img
            src="/images/logo.png"
            alt={tr('দ্য লিটল ফ্লাওয়ার স্কুল', 'The Little Flower School')}
            className="mx-auto h-16 w-16 object-contain"
          />
          <h1 className="mt-3 text-xl font-bold text-navy">
            {tr('অ্যাডমিন লগইন', 'Admin sign in')}
          </h1>
          <p className="mt-1 text-sm text-ink/70">
            {tr('দ্য লিটল ফ্লাওয়ার স্কুল', 'The Little Flower School')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-5" noValidate>
          <div>
            <label htmlFor="admin-email" className="label">
              {tr('ইমেইল', 'Email')}
            </label>
            <input
              id="admin-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              className="input-field"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="label">
              {tr('পাসওয়ার্ড', 'Password')}
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="input-field pr-20"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-royal focus:outline-none focus-visible:ring-2 focus-visible:ring-royal"
              >
                {showPassword ? tr('লুকান', 'Hide') : tr('দেখুন', 'Show')}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}

          {noAccess && (
            <div role="alert" className="error-text space-y-2">
              <p>
                {tr(
                  'এই অ্যাকাউন্টের অ্যাডমিন অ্যাক্সেস নেই। স্কুল প্রশাসনের সাথে যোগাযোগ করুন।',
                  'This account does not have admin access. Contact the school administration.',
                )}
              </p>
              <button
                type="button"
                className="text-sm font-medium text-royal underline"
                onClick={() => {
                  setAttempted(false);
                  void logout();
                }}
              >
                {tr('অন্য অ্যাকাউন্টে লগইন', 'Sign in with another account')}
              </button>
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? tr('লগইন হচ্ছে…', 'Signing in…') : tr('লগইন করুন', 'Sign in')}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <a href="/" className="text-royal hover:underline">
            {tr('ওয়েবসাইটে ফিরুন', 'Back to website')}
          </a>
          <button
            type="button"
            className="text-royal hover:underline"
            onClick={() => setLocale(isBengali ? 'en' : 'bn')}
          >
            {isBengali ? 'English' : 'বাংলা'}
          </button>
        </div>
      </div>
    </main>
  );
    }
