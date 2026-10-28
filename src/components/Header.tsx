// src/components/Header.tsx
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import LanguageToggle from '@/components/LanguageToggle';

/* ── Nav links ── */

interface NavItem {
  path: string;
  labelBn: string;
  labelEn: string;
  highlight?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', labelBn: 'হোম', labelEn: 'Home' },
  { path: '/school-info', labelBn: 'স্কুল তথ্য', labelEn: 'School Info' },
  { path: '/admission', labelBn: 'ভর্তি', labelEn: 'Admission', highlight: true },
  { path: '/results', labelBn: 'ফলাফল', labelEn: 'Results' },
  { path: '/notices', labelBn: 'নোটিশ', labelEn: 'Notices' },
  { path: '/payments', labelBn: 'পেমেন্ট', labelEn: 'Payments' },
  { path: '/gallery', labelBn: 'গ্যালারি', labelEn: 'Gallery' },
  { path: '/contact', labelBn: 'যোগাযোগ', labelEn: 'Contact' },
];

/* ── Component ── */

export default function Header() {
  const { isBengali } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-navy shadow-md">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo + School Name */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <img
              src="/images/logo.png"
              alt="The Little Flower School"
              className="h-10 w-10 object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold leading-tight text-white font-bengali">
                {isBengali ? 'দ্য লিটল ফ্লাওয়ার স্কুল' : 'The Little Flower School'}
              </h1>
              <p className="text-[10px] text-gold-soft">
                {isBengali ? 'স্থাপিত: ২০১৬' : 'Est. 2016'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    item.highlight
                      ? 'bg-gold text-navy-dark hover:bg-gold-soft'
                      : isActive
                        ? 'text-gold'
                        : 'text-white/80 hover:text-white'
                  }`
                }
              >
                {isBengali ? item.labelBn : item.labelEn}
              </NavLink>
            ))}
          </nav>

          {/* Right side: Language toggle + Admin + Mobile menu */}
          <div className="flex items-center gap-2">
            <LanguageToggle />

            <Link
              to="/admine"
              className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:text-white sm:flex"
            >
              <User size={14} />
              {isBengali ? 'অ্যাডমিন' : 'Admin'}
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <nav className="border-t border-white/10 pb-4 pt-2 lg:hidden">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                        item.highlight
                          ? 'bg-gold/15 text-gold'
                          : isActive
                            ? 'text-gold'
                            : 'text-white/80 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    {isBengali ? item.labelBn : item.labelEn}
                  </NavLink>
                </li>
              ))}
              <li>
                <Link
                  to="/admine"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-white/60 hover:text-white"
                >
                  <User size={14} />
                  {isBengali ? 'অ্যাডমিন লগইন' : 'Admin Login'}
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
            }
