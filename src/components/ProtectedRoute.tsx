// src/components/ProtectedRoute.tsx
import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useLanguage } from '@/hooks/useLanguage';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard for admin pages.
 * - If still loading auth state → show spinner
 * - If not logged in → redirect to /admine (login page)
 * - If logged in but no admin role → show access denied
 * - If admin → render children
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAdmin, user } = useAuth();
  const { isBengali } = useLanguage();
  const location = useLocation();

  // Still checking auth state
  if (isLoading) {
    return <LoadingSpinner fullScreen message={isBengali ? 'লোড হচ্ছে…' : 'Loading…'} />;
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/admine" state={{ from: location }} replace />;
  }

  // Logged in but not an admin
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-dark p-6 text-center">
        <div className="rounded-2xl bg-white p-8 shadow-modal">
          <h1 className="text-2xl font-bold text-error">
            {isBengali ? 'অ্যাক্সেস প্রত্যাখ্যাত' : 'Access Denied'}
          </h1>
          <p className="mt-2 text-sm text-ink-light">
            {isBengali
              ? 'আপনার অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই। আপনি যদি অ্যাডমিন হন, তাহলে সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।'
              : 'Your account does not have admin privileges. If you believe this is an error, contact the super admin.'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="btn-primary mt-6"
          >
            {isBengali ? 'হোম পেজে যান' : 'Go to Home'}
          </button>
        </div>
      </div>
    );
  }

  // Authorized
  return <>{children}</>;
}
