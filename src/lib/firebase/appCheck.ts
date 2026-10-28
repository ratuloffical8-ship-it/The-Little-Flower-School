// src/lib/firebase/appCheck.ts
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';
import { getFirebaseApp } from './config';
import { env } from '@/lib/env';

let appCheckInstance: AppCheck | undefined;

/**
 * Initialize Firebase App Check with reCAPTCHA v3.
 * Safe to call multiple times — returns the existing instance.
 *
 * In development, you can set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true`
 * in the browser console BEFORE this runs to use the debug provider.
 */
export function initAppCheck(): AppCheck {
  if (appCheckInstance) return appCheckInstance;

  const app = getFirebaseApp();

  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });

  return appCheckInstance;
}

/**
 * Get the current App Check instance (may be undefined if not initialized).
 */
export function getAppCheck(): AppCheck | undefined {
  return appCheckInstance;
}
