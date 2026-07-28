import type { AssetListParams } from './useAssets'
import type { AssetCard } from '~/types/asset'

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

export function useFavorites() {
  const api = useApi()

  return {
    add: (assetId: string) => api.post<{ favorited: boolean }>(`/assets/${assetId}/favorite`),
    remove: (assetId: string) => api.del<{ favorited: boolean }>(`/assets/${assetId}/favorite`),
    list: (params: AssetListParams = {}) => api.get<AssetCard[]>(`/users/me/favorites${toQuery(params)}`),
  }
}
