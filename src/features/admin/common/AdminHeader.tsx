// src/features/admin/common/AdminHeader.tsx

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';

export interface AdminHeaderProps {
  /** Opens the sidebar drawer on small screens. */
  onMenuClick: () => void;
  /** Reflects drawer state for assistive tech. */
  menuOpen?: boolean;
}

const ROLE_LABELS: Record<string, { bn: string; en: string }> = {
  super_admin: { bn: 'সুপার অ্যাডমিন', en: 'Super admin' },
  school_admin: { bn: 'স্কুল অ্যাডমিন', en: 'School admin' },
  accountant: { bn: 'হিসাবরক্ষক', en: 'Accountant' },
  teacher: { bn: 'শিক্ষক', en: 'Teacher' },
  admission_officer: { bn: 'ভর্তি কর্মকর্তা', en: 'Admission officer' },
};

export default function AdminHeader({ onMenuClick, menuOpen = false }: AdminHeaderProps) {
  const { user, role, logout } = useAuth();
  const { isBengali, setLocale } = useLanguage();
  const navigate = useNavigate();

  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const roleLabel = role
    ? ROLE_LABELS[role]
      ? isBengali
        ? ROLE_LABELS[role].bn
        : ROLE_LABELS[role].en
      : role
    : '';
  const displayName = user?.displayName || user?.email || '';

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate('/admine/login', { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-navy/10 bg-white px-3 sm:px-5">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={tr('মেনু খুলুন', 'Open menu')}
        aria-expanded={menuOpen}
        aria-controls="admin-sidebar"
        className="-ml-1 rounded-md p-2 text-navy hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-royal lg:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <img src="/images/logo.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
        <span className="truncate text-sm font-semibold text-navy sm:text-base">
          {tr('টিএলএফএস অ্যাডমিন', 'TLFS Admin')}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => setLocale(isBengali ? 'en' : 'bn')}
          className="rounded-md px-2 py-1 text-sm font-medium text-royal hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-royal"
        >
          {isBengali ? 'English' : 'বাংলা'}
        </button>

        {displayName && (
          <div className="hidden min-w-0 text-right sm:block">
            <p className="max-w-[12rem] truncate text-sm font-medium text-ink">{displayName}</p>
            {roleLabel && <p className="text-xs text-ink/60">{roleLabel}</p>}
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-navy/20 px-3 py-1.5 text-sm font-medium text-navy hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-royal"
        >
          {tr('লগআউট', 'Log out')}
        </button>
      </div>
    </header>
  );
        }
