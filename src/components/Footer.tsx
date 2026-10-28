// src/components/Footer.tsx
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Youtube } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export default function Footer() {
  const { t, isBengali } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy-dark text-white/80">
      <div className="container-page py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center gap-2.5">
              <img
                src="/images/logo.png"
                alt="Logo"
                className="h-10 w-10 object-contain"
              />
              <div>
                <h2 className="text-sm font-bold text-white font-bengali">
                  {isBengali ? 'দ্য লিটল ফ্লাওয়ার স্কুল' : 'The Little Flower School'}
                </h2>
                <p className="text-xs text-gold-soft">
                  {isBengali ? 'স্থাপিত: ২০১৬' : 'Est. 2016'}
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/60">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gold">
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="transition-colors hover:text-white">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/school-info" className="transition-colors hover:text-white">
                  {t('nav.schoolInfo')}
                </Link>
              </li>
              <li>
                <Link to="/admission" className="transition-colors hover:text-white">
                  {t('nav.admission')}
                </Link>
              </li>
              <li>
                <Link to="/results" className="transition-colors hover:text-white">
                  {t('nav.results')}
                </Link>
              </li>
              <li>
                <Link to="/notices" className="transition-colors hover:text-white">
                  {t('nav.notices')}
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="transition-colors hover:text-white">
                  {t('nav.gallery')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gold">
              {t('footer.contactUs')}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-gold-soft" />
                <span>{t('common.editableSample')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="shrink-0 text-gold-soft" />
                <span>{t('common.editableSample')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="shrink-0 text-gold-soft" />
                <span>{t('common.editableSample')}</span>
              </li>
            </ul>
          </div>

          {/* Social / Follow */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gold">
              {t('footer.followUs')}
            </h3>
            <div className="flex gap-3">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white/5 p-2.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Facebook"
              >
                <Facebook size={18} />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white/5 p-2.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="YouTube"
              >
                <Youtube size={18} />
              </a>
            </div>
            <p className="mt-4 text-xs text-white/40">
              {t('common.editableSample')}
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p>
            {t('footer.copyright').replace('{{year}}', String(currentYear))}
          </p>
          <div className="flex gap-4">
            <Link to="/privacy" className="transition-colors hover:text-white/70">
              {t('nav.privacy')}
            </Link>
            <Link to="/faq" className="transition-colors hover:text-white/70">
              {t('nav.faq')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
