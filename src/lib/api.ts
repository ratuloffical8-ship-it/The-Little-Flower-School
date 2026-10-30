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

export interface UploadOptions {
  /** HTTP method for multipart uploads (default POST) */
  method?: 'POST' | 'PUT' | 'PATCH';
  noAuth?: boolean;
}

/* ── Constants ── */

const COLD_START_RETRIES = 2;
const COLD_START_DELAY_MS = 15_000; // Render free tier can take 30–60s
const WAKE_TIMEOUT_MS = 60_000;

/* ── Core fetch wrapper ── */

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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

  // JSON bodies get a content type. FormData must NOT (the browser adds the boundary).
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

      // Cold start: 502/503/504 from Render while sleeping
      if ([502, 503, 504].includes(response.status) && attempt < retries) {
        lastError = new ServerWakingError();
        await delay(retryDelay);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      let data: unknown;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const body = data as Record<string, string> | string | null;
        const bodyObj = typeof body === 'object' && body !== null ? body : {};
        const apiErr: ApiError = {
          message: bodyObj.message || bodyObj.error || `Request failed (${response.status})`,
          code: bodyObj.code,
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

/* ── File upload (two modes) ── */

/** Mode 1: PUT a file to a pre-signed URL (no auth header). */
function uploadFile(signedUrl: string, file: File, contentType: string): Promise<void>;
/** Mode 2: send multipart FormData to our API (auth attached). Default POST. */
function uploadFile<T = unknown>(
  path: string,
  formData: FormData,
  options?: UploadOptions,
): Promise<T>;
async function uploadFile(
  target: string,
  payload: File | FormData,
  third?: string | UploadOptions,
): Promise<unknown> {
  if (payload instanceof FormData) {
    const opts: UploadOptions = typeof third === 'object' && third !== null ? third : {};
    return request<unknown>(target, {
      method: opts.method ?? 'POST',
      body: payload,
      noAuth: opts.noAuth,
    });
  }

  const contentType =
    typeof third === 'string' ? third : payload.type || 'application/octet-stream';

  const response = await fetch(target, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: payload,
  });
  if (!response.ok) {
    throw new ApiRequestError({
      message: 'File upload failed',
      status: response.status,
    });
  }
  return undefined;
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

  uploadFile,
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
