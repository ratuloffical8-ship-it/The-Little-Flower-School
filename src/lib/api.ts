// src/lib/api.ts
import { getIdToken } from '@/lib/firebase/auth';
import { env } from '@/lib/env';

/* ── Types ── */

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

interface RequestOptions extends RequestInit {
  /** Skip attaching the Firebase auth token */
  noAuth?: boolean;
  /** Number of retries for cold-start (server waking) */
  retries?: number;
  /** Delay between retries in ms */
  retryDelay?: number;
}

/* ── Constants ── */

const COLD_START_RETRIES = 2;
const COLD_START_DELAY_MS = 15_000; // 15 seconds — Render free tier can take 30–60s
const WAKE_TIMEOUT_MS = 60_000;

/* ── Core fetch wrapper ── */

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    noAuth = false,
    retries = COLD_START_RETRIES,
    retryDelay = COLD_START_DELAY_MS,
    headers: customHeaders,
    ...rest
  } = options;

  const url = `${env.VITE_API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  // Attach auth token unless explicitly skipped
  if (!noAuth) {
    const token = await getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Set content type for JSON bodies
  if (rest.body && typeof rest.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WAKE_TIMEOUT_MS);

      const response = await fetch(url, {
        ...rest,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle cold-start: 502/503/504 from Render sleeping
      if ([502, 503, 504].includes(response.status) && attempt < retries) {
        lastError = new ServerWakingError();
        await delay(retryDelay);
        continue;
      }

      // Parse response
      const contentType = response.headers.get('content-type') || '';
      let data: unknown;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const apiErr: ApiError = {
          message:
            (data as Record<string, string>)?.message ||
            (data as Record<string, string>)?.error ||
            `Request failed (${response.status})`,
          code: (data as Record<string, string>)?.code,
          status: response.status,
        };
        throw new ApiRequestError(apiErr);
      }

      return data as T;
    } catch (err) {
      if (err instanceof ApiRequestError) throw err;

      if (err instanceof ServerWakingError && attempt < retries) {
        lastError = err;
        await delay(retryDelay);
        continue;
      }

      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiRequestError({
          message: 'সার্ভার প্রস্তুত হচ্ছে… / Server is waking up. Please try again.',
          code: 'SERVER_WAKING',
          status: 504,
        });
      }

      lastError = err as Error;
      if (attempt < retries) {
        await delay(retryDelay);
        continue;
      }
    }
  }

  throw new ApiRequestError({
    message: lastError?.message || 'Network error. Please try again.',
    code: 'NETWORK_ERROR',
  });
}

/* ── Public helpers ── */

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, {
      ...opts,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, {
      ...opts,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, {
      ...opts,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),

  /**
   * Upload a file using a signed URL (no auth header — the URL is pre-signed).
   */
  uploadFile: async (signedUrl: string, file: File, contentType: string): Promise<void> => {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
    if (!response.ok) {
      throw new ApiRequestError({
        message: 'File upload failed',
        status: response.status,
      });
    }
  },
};

/* ── Custom error classes ── */

export class ApiRequestError extends Error {
  public readonly apiError: ApiError;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiRequestError';
    this.apiError = apiError;
  }
}

export class ServerWakingError extends Error {
  constructor() {
    super('সার্ভার প্রস্তুত হচ্ছে… / Server is waking up…');
    this.name = 'ServerWakingError';
  }
}

/* ── Utility ── */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
    }
