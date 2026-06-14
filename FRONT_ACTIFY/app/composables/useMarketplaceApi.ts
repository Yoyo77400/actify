import { getArtistMock, getAssetMock, homeMock } from '~/composables/useMarketplaceMock'
import type { AssetDetailPayload, ArtistPayload, HomePayload } from '~/types/marketplace'

// Base URL configurable : local en dev, IPFS en dev visant la simulation des fetchs de routes API. Les URLS seront ensuite remplacées par les vraies routes API
const BASE = 'IPFS'

async function fetchWithFallback<T>(path: string, fallback: T) {
  if(BASE === '/data') {
    path = BASE + path
  }
  const { data, error } = await useFetch<T>(`${path}`, {
    key: path
  })

  return {
    data: computed(() => (error.value || !data.value ? fallback : data.value)),
    error,
    status: computed(() => (error.value ? 'error' : 'success')),
    source: computed(() => (error.value ? 'mock' : 'json'))
  }
}

// API functions - Cette partie sera à reprendre plus tard dans les appels pour améliorer les fetchs
export async function useHomeData() {
  return await fetchWithFallback<HomePayload>('https://ipfs.io/ipns/k51qzi5uqu5dgceyd3jw1frpcnqbd4thybutzgn6u8h6lus91op97lm964b29c', homeMock)
}

// L'api et les données mock ne sont pas disponible pour les fonctions suivantes
export async function useArtistData(slug: string) {
  return await fetchWithFallback<ArtistPayload>(`artists/${slug}.json`, getArtistMock(slug))
}

export async function useAssetData(id: string) {
  return await fetchWithFallback<AssetDetailPayload>(`assets/${id}.json`, getAssetMock(id))
}
