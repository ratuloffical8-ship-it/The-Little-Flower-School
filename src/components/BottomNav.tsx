// src/components/BottomNav.tsx
import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, FileText, Award, Bell, MoreHorizontal, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

/* ── Main tabs (always visible) ── */

interface Tab {
  path: string;
  labelBn: string;
  labelEn: string;
  icon: React.ReactNode;
  matchPaths?: string[];
}

const MAIN_TABS: Tab[] = [
  { path: '/', labelBn: 'হোম', labelEn: 'Home', icon: <Home size={20} />, matchPaths: ['/'] },
  { path: '/admission', labelBn: 'ভর্তি', labelEn: 'Admission', icon: <FileText size={20} />, matchPaths: ['/admission', '/admission/status'] },
  { path: '/results', labelBn: 'ফলাফল', labelEn: 'Results', icon: <Award size={20} /> },
  { path: '/notices', labelBn: 'নোটিশ', labelEn: 'Notices', icon: <Bell size={20} /> },
];

/* ── "More" menu items ── */

interface MoreItem {
  path: string;
  labelBn: string;
  labelEn: string;
}

const MORE_ITEMS: MoreItem[] = [
  { path: '/school-info', labelBn: 'স্কুল তথ্য', labelEn: 'School Info' },
  { path: '/payments', labelBn: 'পেমেন্ট', labelEn: 'Payments' },
  { path: '/gallery', labelBn: 'গ্যালারি', labelEn: 'Gallery' },
  { path: '/contact', labelBn: 'যোগাযোগ', labelEn: 'Contact' },
  { path: '/admission/status', labelBn: 'আবেদনের অবস্থা', labelEn: 'Application Status' },
  { path: '/faq', labelBn: 'প্রশ্নোত্তর', labelEn: 'FAQ' },
  { path: '/privacy', labelBn: 'গোপনীয়তা নীতি', labelEn: 'Privacy Policy' },
];

/* ── Component ── */

export default function BottomNav() {
  const { isBengali } = useLanguage();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "More" menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreOpen]);

  // Close "More" menu on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Check if a tab is active
  function isTabActive(tab: Tab): boolean {
    if (tab.matchPaths) {
      return tab.matchPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));
    }
    if (tab.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(tab.path);
  }

  // Check if any "More" item is active
  const isMoreActive = MORE_ITEMS.some(
    (item) => location.pathname === item.path || location.pathname.startsWith(item.path + '/'),
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* "More" popup menu */}
      {moreOpen && (
        <div
          ref={moreRef}
          className="absolute bottom-full left-0 right-0 mb-1 rounded-t-2xl bg-white p-3 shadow-modal"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-sm font-semibold text-navy">
              {isBengali ? 'আরও' : 'More'}
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              className="text-ink-light"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-1">
            {MORE_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-gold/10 font-medium text-navy'
                        : 'text-ink-light hover:bg-surface'
                    }`
                  }
                >
                  {isBengali ? item.labelBn : item.labelEn}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab bar */}
      <ul className="flex items-center justify-around">
        {MAIN_TABS.map((tab) => {
          const active = isTabActive(tab);
          return (
            <li key={tab.path} className="flex-1">
              <NavLink
                to={tab.path}
                end={tab.path === '/'}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? 'text-royal' : 'text-ink-light'
                }`}
              >
                <span className={active ? 'text-royal' : 'text-ink-light'}>
                  {tab.icon}
                </span>
                <span>{isBengali ? tab.labelBn : tab.labelEn}</span>
                {active && (
                  <span className="absolute -top-0.5 h-0.5 w-8 rounded-full bg-gold" />
                )}
              </NavLink>
            </li>
          );
        })}

        {/* "More" tab */}
        <li className="flex-1">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex w-full flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isMoreActive || moreOpen ? 'text-royal' : 'text-ink-light'
            }`}
          >
            <MoreHorizontal size={20} />
            <span>{isBengali ? 'আরও' : 'More'}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
                            }
