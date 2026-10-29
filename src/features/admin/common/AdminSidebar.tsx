// src/features/admin/common/AdminSidebar.tsx

import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';

export interface AdminSidebarProps {
  /** Drawer state on small screens. Ignored at lg and above, where the sidebar is always visible. */
  open: boolean;
  onClose: () => void;
}

type Role = 'super_admin' | 'school_admin' | 'accountant' | 'teacher' | 'admission_officer';

interface NavItem {
  to: string;
  bn: string;
  en: string;
  roles: Role[];
  end?: boolean;
}

interface NavGroup {
  bn: string;
  en: string;
  items: NavItem[];
}

const ALL: Role[] = ['super_admin', 'school_admin', 'accountant', 'teacher', 'admission_officer'];

// Role lists mirror the backend route guards, so a link only shows when its API is reachable.
const NAV: NavGroup[] = [
  {
    bn: 'সাধারণ',
    en: 'General',
    items: [
      { to: '/admine', bn: 'ড্যাশবোর্ড', en: 'Dashboard', roles: ALL, end: true },
      { to: '/admine/reports', bn: 'রিপোর্ট', en: 'Reports', roles: ALL },
    ],
  },
  {
    bn: 'শিক্ষার্থী',
    en: 'Students',
    items: [
      {
        to: '/admine/admissions',
        bn: 'ভর্তি আবেদন',
        en: 'Admissions',
        roles: ['super_admin', 'school_admin', 'admission_officer'],
      },
      {
        to: '/admine/students',
        bn: 'শিক্ষার্থী',
        en: 'Students',
        roles: ['super_admin', 'school_admin', 'accountant', 'teacher', 'admission_officer'],
      },
      {
        to: '/admine/attendance',
        bn: 'উপস্থিতি',
        en: 'Attendance',
        roles: ['super_admin', 'school_admin', 'teacher'],
      },
      {
        to: '/admine/exams',
        bn: 'পরীক্ষা ও ফলাফল',
        en: 'Exams & results',
        roles: ['super_admin', 'school_admin', 'teacher'],
      },
    ],
  },
  {
    bn: 'স্কুল',
    en: 'School',
    items: [
      {
        to: '/admine/teachers',
        bn: 'শিক্ষক',
        en: 'Teachers',
        roles: ['super_admin', 'school_admin', 'teacher'],
      },
      { to: '/admine/notices', bn: 'নোটিশ', en: 'Notices', roles: ['super_admin', 'school_admin'] },
      { to: '/admine/gallery', bn: 'গ্যালারি', en: 'Gallery', roles: ['super_admin', 'school_admin'] },
      { to: '/admine/faq', bn: 'প্রশ্নোত্তর', en: 'FAQ', roles: ['super_admin', 'school_admin'] },
      {
        to: '/admine/contact',
        bn: 'যোগাযোগ বার্তা',
        en: 'Messages',
        roles: ['super_admin', 'school_admin'],
      },
    ],
  },
  {
    bn: 'হিসাব',
    en: 'Finance',
    items: [
      {
        to: '/admine/payments',
        bn: 'পেমেন্ট',
        en: 'Payments',
        roles: ['super_admin', 'school_admin', 'accountant'],
      },
      {
        to: '/admine/invoices',
        bn: 'ইনভয়েস',
        en: 'Invoices',
        roles: ['super_admin', 'school_admin', 'accountant'],
      },
      {
        to: '/admine/expenses',
        bn: 'খরচ',
        en: 'Expenses',
        roles: ['super_admin', 'school_admin', 'accountant'],
      },
    ],
  },
  {
    bn: 'ব্যবস্থাপনা',
    en: 'Administration',
    items: [
      { to: '/admine/settings', bn: 'সেটিংস', en: 'Settings', roles: ['super_admin', 'school_admin'] },
      { to: '/admine/users', bn: 'ব্যবহারকারী', en: 'Users', roles: ['super_admin'] },
    ],
  },
];

export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const { role } = useAuth();
  const { isBengali } = useLanguage();

  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  // Escape closes the drawer (only while it is open).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const groups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !!role && (item.roles as string[]).includes(role)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      {/* Backdrop: small screens only, while the drawer is open */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 top-14 z-30 bg-navy/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="admin-sidebar"
        aria-label={tr('অ্যাডমিন মেনু', 'Admin menu')}
        className={`fixed bottom-0 left-0 top-14 z-40 w-64 overflow-y-auto border-r border-navy/10 bg-white py-3 transition-transform duration-200 lg:visible lg:translate-x-0 ${
          open ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}
      >
        <nav className="space-y-5 px-3">
          {groups.map((group) => (
            <div key={group.en}>
              <p className="px-3 pb-1 text-xs font-semibold text-ink/50">
                {tr(group.bn, group.en)}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `block rounded-md px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-royal ${
                          isActive
                            ? 'bg-navy font-semibold text-white'
                            : 'text-ink hover:bg-surface'
                        }`
                      }
                    >
                      {tr(item.bn, item.en)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
    }
