import type { Collection } from '~/types/collection'
import type { PublicListing } from '~/types/marketplace'

/** Read-only collection endpoints (no write API yet — see collections.routes.ts). */
export function useCollections() {
  const api = useApi()

  return {
    list: () => api.get<Collection[]>('/collections'),
    get: (slug: string) => api.get<Collection>(`/collections/${slug}`),
    assets: (slug: string) => api.get<PublicListing[]>(`/collections/${slug}/assets`),

    /** The caller's own collections — ownership is resolved server-side. */
    mine: () => api.get<Collection[]>('/collections/me'),
    create: (name: string) => api.post<Collection>('/collections', { name }),
    rename: (id: number, name: string) => api.put<Collection>(`/collections/${id}`, { name }),
    remove: (id: number) => api.del<{ id: number; deleted: boolean }>(`/collections/${id}`),

    /** Couverture : le champ `img` ne stocke qu'une clé, les octets passent par ici. */
    uploadImage: (id: number, file: File) => {
      const fd = new FormData()
      fd.append('image', file)
      return api.post<Collection>(`/collections/${id}/image`, fd)
    },
  }
}
