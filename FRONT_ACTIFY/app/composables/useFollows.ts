import type { AssetCard } from '~/types/asset'
import type { CreatorCard } from '~/types/marketplace'

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

export interface FollowedFeedParams {
  page?: number
  limit?: number
}

export interface FollowingListParams {
  q?: string
  page?: number
  limit?: number
}

export function useFollows() {
  const api = useApi()

  return {
    follow: (username: string) => api.post<{ following: boolean }>(`/users/${username}/follow`),
    unfollow: (username: string) => api.del<{ following: boolean }>(`/users/${username}/follow`),
    feed: (params: FollowedFeedParams = {}) => api.get<AssetCard[]>(`/users/me/following/feed${toQuery(params)}`),
    list: (params: FollowingListParams = {}) => api.get<CreatorCard[]>(`/users/me/following${toQuery(params)}`),
  }
}
