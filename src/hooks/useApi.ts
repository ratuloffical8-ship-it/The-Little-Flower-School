// src/hooks/useApi.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { api, ApiRequestError, ServerWakingError } from '@/lib/api';

/* ── Types ── */

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  isWaking: boolean;
  error: string | null;
  errorCode?: string;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
}

type ApiMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/* ── Hook ── */

/**
 * Generic hook for making API calls with loading/error/waking states.
 *
 * Usage:
 *   const { data, isLoading, isWaking, error, execute } = useApi<Student[]>('get', '/api/students');
 *   useEffect(() => { execute(); }, []);
 *
 * Or for POST with body:
 *   const { execute } = useApi<Payment>('post', '/api/payments');
 *   execute(paymentData);
 */
export function useApi<T = unknown>(
  method: ApiMethod,
  path: string,
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: false,
    isWaking: false,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
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
    async (...args: unknown[]): Promise<T | null> => {
      if (!mountedRef.current) return null;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        isWaking: false,
        error: null,
        errorCode: undefined,
      }));

      try {
        let result: T;

        switch (method) {
          case 'get':
            result = await api.get<T>(path);
            break;
          case 'post':
            result = await api.post<T>(path, args[0]);
            break;
          case 'put':
            result = await api.put<T>(path, args[0]);
            break;
          case 'patch':
            result = await api.patch<T>(path, args[0]);
            break;
          case 'delete':
            result = await api.delete<T>(path);
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        if (mountedRef.current) {
          setState({
            data: result,
            isLoading: false,
            isWaking: false,
            error: null,
          });
        }

        return result;
      } catch (err) {
        if (!mountedRef.current) return null;

        if (err instanceof ServerWakingError) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isWaking: true,
            error: 'সার্ভার প্রস্তুত হচ্ছে… / Server is waking up…',
            errorCode: 'SERVER_WAKING',
          }));
          return null;
        }

        if (err instanceof ApiRequestError) {
          setState({
            data: null,
            isLoading: false,
            isWaking: false,
            error: err.apiError.message,
            errorCode: err.apiError.code,
          });
          return null;
        }

        setState({
          data: null,
          isLoading: false,
          isWaking: false,
          error: err instanceof Error ? err.message : 'An unexpected error occurred',
          errorCode: 'UNKNOWN',
        });
        return null;
      }
    },
    [method, path],
  );

  return { ...state, execute, reset };
}

/* ── Convenience: one-shot fetch on mount ── */

export function useApiGet<T = unknown>(path: string, deps: unknown[] = []): UseApiReturn<T> {
  const hook = useApi<T>('get', path);

  useEffect(() => {
    hook.execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return hook;
                                       }
