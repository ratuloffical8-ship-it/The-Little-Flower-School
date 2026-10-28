// src/hooks/useLanguage.ts
/**
 * Re-export from i18n module.
 * This file exists so that `src/main.tsx` can import
 * `LanguageProvider` from `@/hooks/useLanguage` consistently
 * with the other hooks.
 */
export { LanguageProvider, useLanguage } from '@/i18n/index';
export type { Locale, TranslationDict } from '@/i18n/index';
