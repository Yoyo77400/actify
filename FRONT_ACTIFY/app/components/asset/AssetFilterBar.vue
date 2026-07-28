<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[220px]">
        <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
        <input
          v-model.trim="q"
          type="search"
          :placeholder="searchPlaceholder"
          class="input !pl-10"
          :aria-label="searchPlaceholder"
        >
      </div>

      <select v-model="sortValue" class="select max-w-[200px]" aria-label="Trier">
        <option v-for="opt in SORT_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>

      <button
        type="button"
        class="ghost-btn"
        :class="{ '!border-accent !text-accent': hasAdvancedFilters }"
        @click="advancedOpen = !advancedOpen"
      >
        <Icon name="ph:sliders-horizontal" class="text-base" />
        Filtres
        <span v-if="hasAdvancedFilters" class="w-1.5 h-1.5 rounded-full bg-accent" />
      </button>
    </div>

    <div v-if="advancedOpen" class="surface p-4 flex flex-wrap items-center gap-4">
      <div class="flex gap-2">
        <button
          v-for="opt in FREE_OPTIONS"
          :key="opt.key"
          type="button"
          class="chip"
          :class="{ 'chip--active': isFree === opt.value }"
          @click="isFree = opt.value"
        >{{ opt.label }}</button>
      </div>

      <div class="flex items-center gap-2">
        <input v-model.number="minPrice" type="number" min="0" step="0.01" placeholder="Min" class="input w-24">
        <span class="text-muted-2">–</span>
        <input v-model.number="maxPrice" type="number" min="0" step="0.01" placeholder="Max" class="input w-24">
        <span class="text-muted text-xs shrink-0">XRP</span>
      </div>

      <div class="flex gap-2">
        <button
          v-for="opt in RARITY_OPTIONS"
          :key="opt.key"
          type="button"
          class="chip"
          :class="{ 'chip--active': mode === opt.value }"
          @click="mode = opt.value"
        >{{ opt.label }}</button>
      </div>

      <button
        v-if="hasAdvancedFilters"
        type="button"
        class="text-muted text-xs hover:text-foreground hover:underline"
        @click="resetAdvanced"
      >Réinitialiser</button>
    </div>

    <div v-if="categories" class="scroll-x flex gap-2 items-center">
      <button
        type="button"
        class="chip shrink-0"
        :class="{ 'chip--active': category === null }"
        @click="category = null"
      >Tous</button>
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="chip shrink-0"
        :class="{ 'chip--active': category === cat.slug }"
        @click="category = cat.slug"
      >
        {{ cat.name }}
        <span class="text-muted-2 ml-1">{{ cat.listingCount }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CategoryWithCount } from '~/types/asset'

export interface AssetFilterState {
  q: string
  category: string | null
  sort: 'createdAt' | 'price' | 'views' | 'rating' | 'sales'
  order: 'asc' | 'desc'
  isFree: boolean | null
  minPrice: number | null
  maxPrice: number | null
  /** Rarity/edition size: unlimited, limited (capped), or unique (1/1). */
  mode: 'unlimited' | 'limited' | 'unique' | null
}

const props = withDefaults(
  defineProps<{
    /** Renders the category chip row when provided (omit to hide it entirely). */
    categories?: CategoryWithCount[] | null
    initial?: Partial<AssetFilterState>
    searchPlaceholder?: string
  }>(),
  {
    categories: null,
    initial: () => ({}),
    searchPlaceholder: 'Rechercher un asset...',
  },
)

const emit = defineEmits<{ change: [AssetFilterState] }>()

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Plus récents' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'views-desc', label: 'Popularité' },
  { value: 'sales-desc', label: 'Meilleures ventes' },
  { value: 'rating-desc', label: 'Mieux notés' },
] as const
type SortValue = (typeof SORT_OPTIONS)[number]['value']

const FREE_OPTIONS: Array<{ key: string; label: string; value: boolean | null }> = [
  { key: 'all', label: 'Tous', value: null },
  { key: 'free', label: 'Gratuit', value: true },
  { key: 'paid', label: 'Payant', value: false },
]

const RARITY_OPTIONS: Array<{ key: string; label: string; value: AssetFilterState['mode'] }> = [
  { key: 'all', label: 'Toutes raretés', value: null },
  { key: 'unlimited', label: 'Illimité', value: 'unlimited' },
  { key: 'limited', label: 'Limité', value: 'limited' },
  { key: 'unique', label: 'Pièce unique', value: 'unique' },
]

function toSortValue(sort?: string, order?: string): SortValue {
  const candidate = `${sort ?? 'createdAt'}-${order ?? 'desc'}`
  return (SORT_OPTIONS.some((o) => o.value === candidate) ? candidate : 'createdAt-desc') as SortValue
}

const q = ref(props.initial.q ?? '')
const category = ref<string | null>(props.initial.category ?? null)
const sortValue = ref<SortValue>(toSortValue(props.initial.sort, props.initial.order))
const isFree = ref<boolean | null>(props.initial.isFree ?? null)
const minPrice = ref<number | null>(props.initial.minPrice ?? null)
const maxPrice = ref<number | null>(props.initial.maxPrice ?? null)
const mode = ref<AssetFilterState['mode']>(props.initial.mode ?? null)
const advancedOpen = ref(
  isFree.value !== null || minPrice.value !== null || maxPrice.value !== null || mode.value !== null,
)

const hasAdvancedFilters = computed(
  () => isFree.value !== null || minPrice.value != null || maxPrice.value != null || mode.value !== null,
)

function resetAdvanced() {
  isFree.value = null
  minPrice.value = null
  maxPrice.value = null
  mode.value = null
}

function currentState(): AssetFilterState {
  const [sort, order] = sortValue.value.split('-') as [AssetFilterState['sort'], AssetFilterState['order']]
  return {
    q: q.value,
    category: category.value,
    sort,
    order,
    isFree: isFree.value,
    minPrice: minPrice.value,
    maxPrice: maxPrice.value,
    mode: mode.value,
  }
}

function emitChange() {
  emit('change', currentState())
}

// Text/number inputs are debounced so typing doesn't fire a request per
// keystroke; chip/select changes (discrete clicks) apply immediately.
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch([q, minPrice, maxPrice], () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(emitChange, 300)
})
watch([category, sortValue, isFree, mode], emitChange)
</script>
