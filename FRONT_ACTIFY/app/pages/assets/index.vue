<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1">
      <h1 class="ethnocentric text-foreground text-2xl">Marketplace</h1>
      <p class="text-muted text-sm">Parcourez les licences numériques publiées par la communauté Actify.</p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[220px]">
        <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
        <input
          v-model.trim="q"
          type="search"
          placeholder="Rechercher un asset..."
          class="input !pl-10"
          aria-label="Rechercher un asset"
        >
      </div>
      <select v-model="sort" class="select max-w-[200px]" aria-label="Trier">
        <option value="createdAt">Plus récents</option>
        <option value="views">Popularité</option>
        <option value="rating">Mieux notés</option>
        <option value="price">Prix</option>
      </select>
    </div>

    <div class="scroll-x flex gap-2 items-center">
      <button
        type="button"
        class="chip shrink-0"
        :class="{ 'chip--active': activeCategory === null }"
        @click="activeCategory = null"
      >Tous</button>
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="chip shrink-0"
        :class="{ 'chip--active': activeCategory === cat.slug }"
        @click="activeCategory = cat.slug"
      >
        {{ cat.name }}
        <span class="text-muted-2 ml-1">{{ cat.listingCount }}</span>
      </button>
    </div>

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
import type { AssetCard, CategoryWithCount } from '~/types/asset'

type SortKey = 'createdAt' | 'price' | 'views' | 'rating'

const PAGE_SIZE = 12

useHead({ title: 'Marketplace' })

const route = useRoute()
const assetsApi = useAssets()

const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const activeCategory = ref<string | null>(
  typeof route.query.category === 'string' ? route.query.category : null,
)
const SORT_KEYS: readonly SortKey[] = ['createdAt', 'price', 'views', 'rating']
const querySort = route.query.sort
const sort = ref<SortKey>(
  typeof querySort === 'string' && (SORT_KEYS as readonly string[]).includes(querySort)
    ? (querySort as SortKey)
    : 'createdAt',
)
const page = ref(1)

const loading = ref(false)
const reachedEnd = ref(false)
const errorMsg = ref<string | null>(null)

function buildParams() {
  return {
    q: q.value || undefined,
    category: activeCategory.value ?? undefined,
    sort: sort.value,
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

// Debounce keystrokes so typing in the search box doesn't fire a request per character.
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(q, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    fetchPage(true)
  }, 300)
})

// Category / sort changes reset pagination and refetch immediately.
watch([activeCategory, sort], () => {
  page.value = 1
  fetchPage(true)
})
</script>
