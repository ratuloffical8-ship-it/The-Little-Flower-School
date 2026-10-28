// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url('VITE_API_BASE_URL must be a valid URL'),
  VITE_FIREBASE_API_KEY: z.string().min(1, 'VITE_FIREBASE_API_KEY is required'),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'VITE_FIREBASE_AUTH_DOMAIN is required'),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1, 'VITE_FIREBASE_PROJECT_ID is required'),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1, 'VITE_FIREBASE_STORAGE_BUCKET is required'),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, 'VITE_FIREBASE_MESSAGING_SENDER_ID is required'),
  VITE_FIREBASE_APP_ID: z.string().min(1, 'VITE_FIREBASE_APP_ID is required'),
  VITE_RECAPTCHA_SITE_KEY: z.string().min(1, 'VITE_RECAPTCHA_SITE_KEY is required'),
  VITE_SITE_URL: z.string().url('VITE_SITE_URL must be a valid URL'),
});

function getEnv() {
  const raw = {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    VITE_RECAPTCHA_SITE_KEY: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
    VITE_SITE_URL: import.meta.env.VITE_SITE_URL,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `❌ Invalid environment variables:\n${missing}\n\nCheck your .env file or Render Static Site environment variables.`,
    );
  }

  return result.data;
}

export const env = getEnv();
