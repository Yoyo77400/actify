import { FetchError } from 'ofetch'
import type { ApiError } from '~/types/auth'

interface ApiEnvelope<T> {
  success: boolean
  data: T
  meta?: { page: number; limit: number; total: number; totalPages: number }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
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

  async function rawRequest<T>(path: string, opts: RequestOptions): Promise<T> {
    const res = await $fetch<ApiEnvelope<T>>(path, {
      baseURL: config.public.apiBase,
      method: opts.method ?? 'GET',
      body: opts.body,
      headers: store.accessToken ? { Authorization: `Bearer ${store.accessToken}` } : {},
    })
    return res.data
  }

  // Access tokens only live 15 min: on 401, swap the refresh token for a new
  // one and replay the request once before giving up.
  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    try {
      return await rawRequest<T>(path, opts)
    } catch (err) {
      const expired = err instanceof FetchError && err.statusCode === 401 && store.refreshToken
      if (!expired) throw err

      try {
        const { accessToken } = await $fetch<ApiEnvelope<{ accessToken: string }>>('/auth/refresh', {
          baseURL: config.public.apiBase,
          method: 'POST',
          body: { refreshToken: store.refreshToken },
        }).then(res => res.data)
        store.setTokens({ accessToken })
      } catch {
        store.clearSession()
        throw err
      }
      return await rawRequest<T>(path, opts)
    }
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: Record<string, unknown>) => request<T>(path, { method: 'POST', body }),
    put: <T>(path: string, body?: Record<string, unknown>) => request<T>(path, { method: 'PUT', body }),
    del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}
