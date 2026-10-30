// src/hooks/useApi.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { api, ApiRequestError, ServerWakingError } from '@/lib/api';

/* ── Types ── */

type ApiMethod =
  | 'get' | 'post' | 'put' | 'patch' | 'delete'
  | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  isWaking: boolean;
  error: string | null;
  errorCode?: string;
}

interface UseApiBase<T> extends UseApiState<T> {
  reset: () => void;
}

/** Fixed-path mode: useApi('post', '/api/x') → execute(body?) → T | null (never throws). */
export interface UseApiFixed<T> extends UseApiBase<T> {
  execute: (...args: unknown[]) => Promise<T | null>;
}

/** Dynamic-path mode: useApi('PATCH') → execute(path, body?) → T (throws on failure). */
export interface UseApiDynamic<T> extends UseApiBase<T> {
  execute: (path: string, body?: unknown) => Promise<T>;
}

/* ── Helpers ── */

function callApi<R>(method: string, url: string, body?: unknown): Promise<R> {
  switch (method.toLowerCase()) {
    case 'get':
      return api.get<R>(url);
    case 'post':
      return api.post<R>(url, body);
    case 'put':
      return api.put<R>(url, body);
    case 'patch':
      return api.patch<R>(url, body);
    case 'delete':
      return api.delete<R>(url);
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

function describeError(err: unknown): { message: string; code?: string; waking: boolean } {
  if (err instanceof ServerWakingError) {
    return {
      message: 'সার্ভার প্রস্তুত হচ্ছে… / Server is waking up…',
      code: 'SERVER_WAKING',
      waking: true,
    };
  }
  if (err instanceof ApiRequestError) {
    const { message, code, status } = err.apiError;
    const waking =
      code === 'SERVER_WAKING' || status === 502 || status === 503 || status === 504;
    return { message, code, waking };
  }
  return {
    message: err instanceof Error ? err.message : 'An unexpected error occurred',
    code: 'UNKNOWN',
    waking: false,
  };
}

/* ── Hook ── */

/**
 * Fixed path (public pages):
 *   const { execute } = useApi<Payment>('post', '/api/payments/submit');
 *   const result = await execute(body);      // T | null, error is in `error`
 *
 * Dynamic path (admin pages):
 *   const { execute } = useApi('PATCH');
 *   await execute('/api/payments/abc/review', body);   // T, throws on failure
 */
export function useApi<T = unknown>(method: ApiMethod, path: string): UseApiFixed<T>;
export function useApi<T = unknown>(method: ApiMethod): UseApiDynamic<T>;
export function useApi<T = unknown>(
  method: ApiMethod,
  path?: string,
): UseApiFixed<T> | UseApiDynamic<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: false,
    isWaking: false,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    if (mountedRef.current) {
      setState({ data: null, isLoading: false, isWaking: false, error: null });
    }
  }, []);

  const execute = useCallback(
    async (...args: unknown[]): Promise<unknown> => {
      const dynamic = path === undefined;
      const url = dynamic ? String(args[0] ?? '') : (path as string);
      const body = dynamic ? args[1] : args[0];

      if (!url) {
        if (dynamic) throw new Error('API path is required');
        return null;
      }

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          isWaking: false,
          error: null,
          errorCode: undefined,
        }));
      }

      try {
        const result = await callApi<T>(method, url, body);
        if (mountedRef.current) {
          setState({ data: result, isLoading: false, isWaking: false, error: null });
        }
        return result;
      } catch (err) {
        const info = describeError(err);
        if (mountedRef.current) {
          setState({
            data: null,
            isLoading: false,
            isWaking: info.waking,
            error: info.message,
            errorCode: info.code,
          });
        }
        if (dynamic) throw err;
        return null;
      }
    },
    [method, path],
  );

  return { ...state, execute, reset } as unknown as UseApiFixed<T>;
}

/* ── Convenience: fetch on mount / when path or deps change ── */

/** An empty string path means "do not fetch yet". `execute()` refetches. */
export function useApiGet<T = unknown>(path: string, deps: unknown[] = []): UseApiFixed<T> {
  const hook = useApi<T>('get', path);
  const { execute } = hook;

  useEffect(() => {
    if (path) {
      void execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, execute, ...deps]);

  return hook;
  }
