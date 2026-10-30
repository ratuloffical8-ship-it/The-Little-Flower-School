// src/i18n/index.ts
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { bn } from './bn';
import { en } from './en';

/* ── Types ── */

export type Locale = 'bn' | 'en';

export type TranslationDict = typeof bn;

type DeepStringRecord = { [key: string]: string | DeepStringRecord };

/* ── Translations map ── */

const translations: Record<Locale, TranslationDict> = { bn, en };

/* ── Context ── */

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isBengali: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

/* ── Provider ── */

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('tlfs_locale') as Locale | null;
    return saved === 'en' || saved === 'bn' ? saved : 'bn';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('tlfs_locale', newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.');
      let current: DeepStringRecord | string = translations[locale] as unknown as DeepStringRecord;

      for (const k of keys) {
        if (typeof current === 'string') return key; // fallback: return key itself
        current = (current as DeepStringRecord)[k];
        if (current === undefined) return key;
      }

      return typeof current === 'string' ? current : key;
    },
    [locale],
  );

  const isBengali = locale === 'bn';

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isBengali }}>
      {children}
    </LanguageContext.Provider>
  );
}

/* ── Hook ── */

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
    }
