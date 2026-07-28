import { FetchError } from 'ofetch'
import type {
  AdminAsset,
  AdminAssetStatus,
  AdminAssetUpdateBody,
  AdminOrder,
  AdminStats,
  AdminUser,
  AdminUserDetail,
  AdminUserUpdateBody,
  PageMeta,
} from '~/types/admin'
import type { AssetCard } from '~/types/asset'

const REQUEST_TIMEOUT_MS = 15_000

// Query params supported by the admin list endpoints (see admin.controller.ts).
export interface AdminAssetListParams {
  status?: AdminAssetStatus
  sellerId?: string
  q?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface AdminUserListParams {
  q?: string
  banned?: boolean
  role?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface AdminOrderListParams {
  status?: string
  q?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface Paginated<T> {
  items: T[]
  meta: PageMeta
}

interface ListEnvelope<T> {
  success: boolean
  data: T[]
  meta: PageMeta
}

function toQuery(params: object): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function useAdminApi() {
  const api = useApi()
  const config = useRuntimeConfig()
  const store = useAuthStore()

  // useApi().get unwraps the envelope and drops `meta`, which the admin tables
  // need for real pagination. This raw GET keeps the envelope; an expiry 401
  // goes through the same single-flight refresh as useApi, then replays once.
  async function listWithMeta<T>(path: string): Promise<Paginated<T>> {
    const call = () =>
      $fetch<ListEnvelope<T>>(path, {
        baseURL: config.public.apiBase,
        headers: store.accessToken ? { Authorization: `Bearer ${store.accessToken}` } : {},
        timeout: REQUEST_TIMEOUT_MS,
      })

    let res: ListEnvelope<T>
    try {
      res = await call()
    } catch (err) {
      const expired =
        err instanceof FetchError
        && err.statusCode === 401
        && toApiError(err)?.code === 'AUTH_REQUIRED'
        && !!store.refreshToken
      if (!expired) throw err
      try {
        await api.refreshSession()
      } catch {
        throw err
      }
      res = await call()
    }
    return { items: res.data, meta: res.meta }
  }

  return {
    stats: () => api.get<AdminStats>('/admin/stats'),

    listAssets: (params: AdminAssetListParams = {}) =>
      listWithMeta<AdminAsset>(`/admin/assets${toQuery(params)}`),
    getAsset: (id: string) => api.get<AssetCard>(`/admin/assets/${id}`),
    updateAsset: (id: string, body: AdminAssetUpdateBody) =>
      api.put<AssetCard>(`/admin/assets/${id}`, body),
    updateAssetStatus: (id: string, status: AdminAssetStatus) =>
      api.put<{ id: string; status: AdminAssetStatus }>(`/admin/assets/${id}/status`, { status }),
    removeAsset: (id: string) =>
      api.del<{ id: string; status: AdminAssetStatus; deletedAt: string }>(`/admin/assets/${id}`),

    listUsers: (params: AdminUserListParams = {}) =>
      listWithMeta<AdminUser>(`/admin/users${toQuery(params)}`),
    getUser: (id: string) => api.get<AdminUserDetail>(`/admin/users/${id}`),
    updateUser: (id: string, body: AdminUserUpdateBody) =>
      api.put<{ id: string; username: string | null; displayName: string | null; bio: string | null }>(
        `/admin/users/${id}`,
        body,
      ),
    banUser: (id: string) => api.post<{ id: string; isBanned: boolean }>(`/admin/users/${id}/ban`),
    unbanUser: (id: string) => api.post<{ id: string; isBanned: boolean }>(`/admin/users/${id}/unban`),
    updateUserRole: (id: string, role: string) =>
      api.put<{ id: string; role: string }>(`/admin/users/${id}/role`, { role }),

    listOrders: (params: AdminOrderListParams = {}) =>
      listWithMeta<AdminOrder>(`/admin/orders${toQuery(params)}`),
  }
}
