import type {
  AssetCard,
  AssetDetail,
  CategoryWithCount,
  CreateAssetBody,
} from '~/types/asset'

export interface AssetListParams {
  q?: string
  category?: string
  sort?: 'createdAt' | 'price' | 'rating' | 'sales' | 'views'
  order?: 'asc' | 'desc'
  isFree?: boolean
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

export function useAssets() {
  const api = useApi()

  return {
    list: (params: AssetListParams = {}) => api.get<AssetCard[]>(`/assets${toQuery(params)}`),
    get: (idOrSlug: string) => api.get<AssetDetail>(`/assets/${idOrSlug}`),
    categories: () => api.get<CategoryWithCount[]>('/categories'),
    create: (body: CreateAssetBody) => api.post<AssetCard>('/assets', body),
    publish: (id: string) => api.post<AssetCard>(`/assets/${id}/publish`),
    myListings: () => api.get<AssetCard[]>('/creator/listings'),
    uploadFile: (id: string, file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post<{ hasFile: boolean }>(`/assets/${id}/file`, fd)
    },
    uploadThumbnail: (id: string, file: File) => {
      const fd = new FormData()
      fd.append('thumbnail', file)
      return api.post<{ thumbnailCid: string }>(`/assets/${id}/thumbnail`, fd)
    },
  }
}
