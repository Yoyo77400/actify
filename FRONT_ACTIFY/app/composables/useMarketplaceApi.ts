import type { PublicListing, PublicProfile } from '~/types/marketplace'

// Public artist pages: profile + published assets, both anonymous-friendly
// (see API users.routes — GET /users/:username and /users/:username/assets).

export interface ProfileAssetsParams {
  page?: number
  limit?: number
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

export function useMarketplaceApi() {
  const api = useApi()

  return {
    profile: (username: string) => api.get<PublicProfile>(`/users/${username}`),
    profileAssets: (username: string, params: ProfileAssetsParams = {}) =>
      api.get<PublicListing[]>(`/users/${username}/assets${toQuery(params)}`),
  }
}
