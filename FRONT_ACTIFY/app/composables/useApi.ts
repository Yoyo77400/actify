import { FetchError } from 'ofetch'
import type { ApiError } from '~/types/auth'

// Abort a request that hangs (unreachable API, dead proxy) instead of spinning
// forever — the caller turns the resulting error into a clear message.
const REQUEST_TIMEOUT_MS = 15_000

interface ApiEnvelope<T> {
  success: boolean
  data: T
  meta?: { page: number; limit: number; total: number; totalPages: number }
}

/**
 * True for a request that never got an HTTP response (DNS/connection failure,
 * timeout abort) — as opposed to a response with an error status.
 */
export function isNetworkError(err: unknown): boolean {
  return err instanceof FetchError && err.statusCode == null
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
  /** false = never send the Authorization header (anonymous-by-intent calls, e.g. wallet login). */
  auth?: boolean
}

/** Extracts the backend's error payload from a failed request, if any. */
export function toApiError(err: unknown): ApiError | null {
  if (err instanceof FetchError && err.data?.error?.code) {
    return err.data.error as ApiError
  }
  return null
}

export function useApi() {
  const config = useRuntimeConfig()
  const store = useAuthStore()
  // Stashed on nuxtApp, NOT at module scope: module state would leak one
  // user's refresh promise into another request during SSR.
  const nuxtApp = useNuxtApp() as { _refreshInFlight?: Promise<void> | null }

  async function rawRequest<T>(path: string, opts: RequestOptions): Promise<T> {
    const sendAuth = opts.auth !== false && !!store.accessToken
    const res = await $fetch<ApiEnvelope<T>>(path, {
      baseURL: config.public.apiBase,
      method: opts.method ?? 'GET',
      body: opts.body,
      headers: sendAuth ? { Authorization: `Bearer ${store.accessToken}` } : {},
      timeout: REQUEST_TIMEOUT_MS,
    })
    return res.data
  }

  // Single-flight: concurrent 401s share one /auth/refresh round-trip. The
  // backend rotates the refresh token, so the new pair must be stored.
  function refreshSession(): Promise<void> {
    nuxtApp._refreshInFlight ??= $fetch<ApiEnvelope<{ accessToken: string; refreshToken: string }>>('/auth/refresh', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { refreshToken: store.refreshToken },
      timeout: REQUEST_TIMEOUT_MS,
    })
      .then((res) => {
        store.setTokens(res.data)
      })
      .catch((err) => {
        // Only a rejected token kills the session; a network blip must not log the user out.
        if (err instanceof FetchError && err.statusCode && err.statusCode < 500) {
          store.clearSession()
        }
        throw err
      })
      .finally(() => {
        nuxtApp._refreshInFlight = null
      })
    return nuxtApp._refreshInFlight
  }

  // Access tokens only live 15 min: on an expiry 401 (and only that — business
  // 401s like INVALID_SIGNATURE must not replay mutating requests), swap the
  // refresh token for a new pair and replay the request once.
  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    try {
      return await rawRequest<T>(path, opts)
    } catch (err) {
      const expired =
        opts.auth !== false
        && err instanceof FetchError
        && err.statusCode === 401
        && toApiError(err)?.code === 'AUTH_REQUIRED'
        && !!store.refreshToken
      if (!expired) throw err

      try {
        await refreshSession()
      } catch {
        throw err
      }
      return await rawRequest<T>(path, opts)
    }
  }

  return {
    get: <T>(path: string, opts?: Pick<RequestOptions, 'auth'>) => request<T>(path, opts),
    post: <T>(path: string, body?: Record<string, unknown>, opts?: Pick<RequestOptions, 'auth'>) =>
      request<T>(path, { ...opts, method: 'POST', body }),
    put: <T>(path: string, body?: Record<string, unknown>) => request<T>(path, { method: 'PUT', body }),
    del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    refreshSession,
  }
}
