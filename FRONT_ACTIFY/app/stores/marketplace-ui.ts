import { computed, ref } from 'vue'

export const useMarketplaceUiStore = defineStore('marketplace-ui', () => {
  const selectedCategory = ref('all')
  const selectedChain = ref('all')
  const selectedArtistTab = ref<'collections' | 'items'>('collections')
  const assetTab = ref<'description' | 'orders' | 'activity'>('description')
  const favorites = ref<string[]>([])

  function setCategory(categoryId: string) {
    selectedCategory.value = categoryId
  }

  function setChain(chainId: string) {
    selectedChain.value = chainId
  }

  function setArtistTab(tab: 'collections' | 'items') {
    selectedArtistTab.value = tab
  }

  function setAssetTab(tab: 'description' | 'orders' | 'activity') {
    assetTab.value = tab
  }

  function toggleFavorite(assetId: string) {
    favorites.value = favorites.value.includes(assetId)
      ? favorites.value.filter((id) => id !== assetId)
      : [...favorites.value, assetId]
  }

  const favoriteCount = computed(() => favorites.value.length)

  return {
    selectedCategory,
    selectedChain,
    selectedArtistTab,
    assetTab,
    favorites,
    favoriteCount,
    setCategory,
    setChain,
    setArtistTab,
    setAssetTab,
    toggleFavorite
  }
})
