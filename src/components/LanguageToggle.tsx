// src/components/LanguageToggle.tsx
import { useLanguage } from '@/hooks/useLanguage';
import type { Locale } from '@/hooks/useLanguage';

export default function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  const toggle = () => {
    const next: Locale = locale === 'bn' ? 'en' : 'bn';
    setLocale(next);
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2.5 py-1 text-xs font-semibold text-white/80 transition-colors hover:border-gold hover:text-gold"
      aria-label={locale === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
      title={locale === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
    >
      <span className={locale === 'bn' ? 'text-gold' : 'text-white/50'}>বাং</span>
      <span className="text-white/30">/</span>
      <span className={locale === 'en' ? 'text-gold' : 'text-white/50'}>En</span>
    </button>
  );
      }
