<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1">
      <h1 class="ethnocentric text-foreground text-2xl">Marketplace</h1>
      <p class="text-muted text-sm">Parcourez les licences numériques publiées par la communauté Actify.</p>
    </div>

    <AssetFilterBar :categories="categories" :initial="initialFilters" @change="onFiltersChange" />

    <p v-if="errorMsg" class="surface p-4 text-danger text-sm" role="alert">{{ errorMsg }}</p>

    <div
      v-if="items.length"
      class="grid grid-cols-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4"
    >
      <AssetMarketAssetCard v-for="asset in items" :key="asset.id" :asset="asset" />
    </div>

    <div v-else-if="!loading && !errorMsg" class="surface p-10 flex flex-col items-center gap-3 text-center">
      <Icon name="ph:package" class="text-3xl text-muted-2" />
      <p class="text-foreground font-medium">Aucun asset trouvé</p>
      <p class="text-muted text-sm">Essayez d'ajuster votre recherche ou vos filtres.</p>
    </div>

    <div v-if="loading" class="flex justify-center py-4">
      <span class="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>

    <div v-if="items.length && !reachedEnd" class="flex justify-center pt-2">
      <button type="button" class="secondary-btn" :disabled="loading" @click="loadMore">
        Charger plus
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AssetFilterState } from '~/components/asset/AssetFilterBar.vue'
import type { AssetCard, CategoryWithCount } from '~/types/asset'

const PAGE_SIZE = 12

useHead({ title: 'Marketplace' })

const route = useRoute()
const assetsApi = useAssets()

// Every filter is deep-linkable: shareable/bookmarkable search results, same
// as browsing a normal shop.
const initialFilters: Partial<AssetFilterState> = {
  q: typeof route.query.q === 'string' ? route.query.q : undefined,
  category: typeof route.query.category === 'string' ? route.query.category : undefined,
  sort: typeof route.query.sort === 'string' ? (route.query.sort as AssetFilterState['sort']) : undefined,
  order: route.query.order === 'asc' ? 'asc' : route.query.order === 'desc' ? 'desc' : undefined,
  isFree: route.query.isFree === 'true' ? true : route.query.isFree === 'false' ? false : undefined,
  minPrice: typeof route.query.minPrice === 'string' && route.query.minPrice !== '' ? Number(route.query.minPrice) : undefined,
  maxPrice: typeof route.query.maxPrice === 'string' && route.query.maxPrice !== '' ? Number(route.query.maxPrice) : undefined,
  mode: typeof route.query.mode === 'string' ? (route.query.mode as AssetFilterState['mode']) : undefined,
}

const filters = ref<AssetFilterState>({
  q: initialFilters.q ?? '',
  category: initialFilters.category ?? null,
  sort: initialFilters.sort ?? 'createdAt',
  order: initialFilters.order ?? 'desc',
  isFree: initialFilters.isFree ?? null,
  minPrice: initialFilters.minPrice ?? null,
  maxPrice: initialFilters.maxPrice ?? null,
  mode: initialFilters.mode ?? null,
})
const page = ref(1)

const loading = ref(false)
const reachedEnd = ref(false)
const errorMsg = ref<string | null>(null)

function buildParams() {
  const f = filters.value
  return {
    q: f.q || undefined,
    category: f.category ?? undefined,
    sort: f.sort,
    order: f.order,
    isFree: f.isFree ?? undefined,
    minPrice: f.minPrice ?? undefined,
    maxPrice: f.maxPrice ?? undefined,
    mode: f.mode ?? undefined,
    page: page.value,
    limit: PAGE_SIZE,
  }
}

// Categories power the filter chips; a failure here must not block the catalogue.
const { data: categories } = await useAsyncData(
  'market-categories',
  () => assetsApi.categories(),
  { default: () => [] as CategoryWithCount[] },
)

// First page runs during SSR so the grid is populated on initial render.
const { data: firstPage, error: firstError } = await useAsyncData('market-assets', () =>
  assetsApi.list(buildParams()),
)

const items = ref<AssetCard[]>(firstPage.value ?? [])
reachedEnd.value = (firstPage.value?.length ?? 0) < PAGE_SIZE
if (firstError.value) {
  errorMsg.value = toApiError(firstError.value)?.message ?? 'Impossible de charger le catalogue.'
}

// Monotonic token: a slow append that resolves after a reset (user changed
// filter/sort mid-load) is discarded instead of clobbering the new list.
let requestSeq = 0

async function fetchPage(reset: boolean) {
  const seq = ++requestSeq
  loading.value = true
  errorMsg.value = null
  try {
    const batch = await assetsApi.list(buildParams())
    if (seq !== requestSeq) return
    items.value = reset ? batch : [...items.value, ...batch]
    reachedEnd.value = batch.length < PAGE_SIZE
  } catch (err) {
    if (seq !== requestSeq) return
    errorMsg.value = toApiError(err)?.message ?? 'Impossible de charger le catalogue.'
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function loadMore() {
  page.value += 1
  fetchPage(false)
}

// AssetFilterBar already debounces text/number inputs internally; any change
// it emits (search, sort, category, price range, free/paid) resets pagination.
function onFiltersChange(next: AssetFilterState) {
  filters.value = next
  page.value = 1
  fetchPage(true)
}
</script>
