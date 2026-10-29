// server/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().int().min(1).max(65535).default(3001),

  /** Comma-separated list of allowed frontend origins */
  FRONTEND_ORIGIN: z
    .string()
    .min(1)
    .default('http://localhost:5173'),

  FIREBASE_PROJECT_ID: z.string().min(1),

  FIREBASE_STORAGE_BUCKET: z.string().min(1),

  /** Base64-encoded Firebase service account JSON */
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().min(1),

  /** Whether to enforce Firebase App Check on all requests */
  RECAPTCHA_ENFORCE_APP_CHECK: z
    .enum(['true', 'false'])
    .default('false'),

  /** Email to auto-promote to super_admin on first bootstrap (optional) */
  BOOTSTRAP_SUPER_ADMIN_EMAIL: z.string().email().optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');

    console.error(
      '[ENV] Invalid environment variables:\n' + formatted
    );
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
