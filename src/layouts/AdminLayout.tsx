// src/layouts/AdminLayout.tsx
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  CalendarCheck,
  FileCheck,
  Award,
  DollarSign,
  CreditCard,
  Receipt,
  Megaphone,
  HelpCircle,
  Image,
  Mail,
  BarChart3,
  Settings,
  Shield,
  ScrollText,
  Database,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import type { AdminRole } from '@/types';

/* ── Menu item config ── */

interface MenuItem {
  path: string;
  labelBn: string;
  labelEn: string;
  icon: React.ReactNode;
  roles: AdminRole[];
}

const ALL_ROLES: AdminRole[] = [
  'super_admin',
  'school_admin',
  'accountant',
  'teacher',
  'admission_officer',
];

const MENU_ITEMS: MenuItem[] = [
  { path: '/admine/dashboard', labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ALL_ROLES },
  { path: '/admine/admissions', labelBn: 'ভর্তি আবেদন', labelEn: 'Admissions', icon: <FileText size={18} />, roles: ['super_admin', 'school_admin', 'admission_officer'] },
  { path: '/admine/students', labelBn: 'শিক্ষার্থী', labelEn: 'Students', icon: <Users size={18} />, roles: ['super_admin', 'school_admin', 'teacher', 'admission_officer'] },
  { path: '/admine/classes', labelBn: 'শ্রেণি ও সেকশন', labelEn: 'Classes', icon: <BookOpen size={18} />, roles: ['super_admin', 'school_admin', 'teacher'] },
  { path: '/admine/teachers', labelBn: 'শিক্ষক ও কর্মচারী', labelEn: 'Teachers', icon: <GraduationCap size={18} />, roles: ['super_admin', 'school_admin'] },
  { path: '/admine/attendance', labelBn: 'উপস্থিতি', labelEn: 'Attendance', icon: <CalendarCheck size={18} />, roles: ['super_admin', 'school_admin', 'teacher'] },
  { path: '/admine/exams', labelBn: 'পরীক্ষা', labelEn: 'Exams', icon: <ClipboardCheck size={18} />, roles: ['super_admin', 'school_admin', 'teacher'] },
  { path: '/admine/results', labelBn: 'ফলাফল', labelEn: 'Results', icon: <Award size={18} />, roles: ['super_admin', 'school_admin', 'teacher'] },
  { path: '/admine/fees', labelBn: 'ফি ও ইনভয়েস', labelEn: 'Fees', icon: <DollarSign size={18} />, roles: ['super_admin', 'school_admin', 'accountant'] },
  { path: '/admine/payments', labelBn: 'পেমেন্ট যাচাই', labelEn: 'Payments', icon: <CreditCard size={18} />, roles: ['super_admin', 'school_admin', 'accountant'] },
  { path: '/admine/expenses', labelBn: 'আয়-ব্যয়', labelEn: 'Expenses', icon: <Receipt size={18} />, roles: ['super_admin', 'school_admin', 'accountant'] },
  { path: '/admine/notices', labelBn: 'নোটিশ', labelEn: 'Notices', icon: <Megaphone size={18} />, roles: ['super_admin', 'school_admin'] },
  { path: '/admine/faqs', labelBn: 'প্রশ্নোত্তর', labelEn: 'FAQs', icon: <HelpCircle size={18} />, roles: ['super_admin', 'school_admin'] },
  { path: '/admine/gallery', labelBn: 'গ্যালারি', labelEn: 'Gallery', icon: <Image size={18} />, roles: ['super_admin', 'school_admin'] },
  { path: '/admine/contacts', labelBn: 'যোগাযোগ বার্তা', labelEn: 'Contacts', icon: <Mail size={18} />, roles: ['super_admin', 'school_admin'] },
  { path: '/admine/reports', labelBn: 'রিপোর্ট', labelEn: 'Reports', icon: <BarChart3 size={18} />, roles: ['super_admin', 'school_admin', 'accountant'] },
  { path: '/admine/settings', labelBn: 'সেটিংস', labelEn: 'Settings', icon: <Settings size={18} />, roles: ['super_admin', 'school_admin'] },
  { path: '/admine/admins', labelBn: 'অ্যাডমিন ব্যবহারকারী', labelEn: 'Admin Users', icon: <Shield size={18} />, roles: ['super_admin'] },
  { path: '/admine/logs', labelBn: 'কার্যকলাপ লগ', labelEn: 'Audit Logs', icon: <ScrollText size={18} />, roles: ['super_admin'] },
  { path: '/admine/backup', labelBn: 'ব্যাকআপ', labelEn: 'Backup', icon: <Database size={18} />, roles: ['super_admin'] },
];

/* ── Component ── */

export default function AdminLayout() {
  const { user, role, logout } = useAuth();
  const { t, isBengali } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = MENU_ITEMS.filter(
    (item) => role && item.roles.includes(role),
  );

  const handleLogout = async () => {
    await logout();
    navigate('/admine');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Sidebar header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
        <img
          src="/images/logo.png"
          alt="Logo"
          className="h-9 w-9 object-contain"
        />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-white">
            {isBengali ? 'দ্য লিটল ফ্লাওয়ার স্কুল' : 'The Little Flower School'}
          </h1>
          <p className="truncate text-xs text-white/60">{user?.email}</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-gold/15 text-gold font-medium'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {item.icon}
                <span className="truncate">
                  {isBengali ? item.labelBn : item.labelEn}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={18} />
          <span>{t('admin.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-navy-dark lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-navy-dark shadow-modal">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-4 text-white/60 hover:text-white"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-border bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-ink"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-sm font-semibold text-navy">
            {isBengali ? 'অ্যাডমিন প্যানেল' : 'Admin Panel'}
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
    }
