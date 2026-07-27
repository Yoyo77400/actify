<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1">
      <h1 class="ethnocentric text-foreground text-2xl">Recherche</h1>
      <p v-if="q" class="text-muted text-sm">
        Résultats pour « <span class="text-foreground">{{ q }}</span> »
      </p>
    </div>

    <div class="relative">
      <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
      <input
        v-model.trim="term"
        type="search"
        placeholder="Rechercher un asset, une collection ou un créateur..."
        class="input !pl-10"
        aria-label="Rechercher"
      >
    </div>

    <p v-if="!q" class="surface p-8 text-center text-muted text-sm">
      Saisissez un nom d'asset, de collection ou de créateur.
    </p>
    <p v-else-if="error" class="surface p-8 text-center text-danger text-sm" role="alert">
      La recherche a échoué, réessayez.
    </p>
    <p v-else-if="isEmpty" class="surface p-8 text-center text-muted text-sm">
      Aucun résultat pour « {{ q }} ».
    </p>

    <template v-else>
      <section v-if="results.assets.length">
        <CommonSectionHeader title="Assets" :subtitle="`${results.assets.length} résultat(s)`" />
        <div class="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-4">
          <ArtistAssetCard v-for="item in results.assets" :key="item.id" :item="item" />
        </div>
      </section>

      <section v-if="results.collections.length">
        <CommonSectionHeader title="Collections" :subtitle="`${results.collections.length} résultat(s)`" />
        <div class="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-4">
          <NuxtLink
            v-for="col in results.collections"
            :key="col.id"
            :to="`/collections/${col.slug}`"
            class="surface overflow-hidden"
          >
            <img
              :src="col.img ?? bannerImage(null, col.slug)"
              :alt="col.name"
              class="w-full h-[140px] object-cover bg-panel-3"
              loading="lazy"
            >
            <div class="p-3.5">
              <h3 class="ethnocentric m-0 text-base line-clamp-1">{{ col.name }}</h3>
              <p class="mt-1.5 mb-0 text-muted text-xs">{{ col.listingCount }} asset(s)</p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <section v-if="results.creators.length">
        <CommonSectionHeader title="Créateurs" :subtitle="`${results.creators.length} résultat(s)`" />
        <div class="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-4">
          <NuxtLink
            v-for="creator in results.creators"
            :key="creator.id"
            :to="creator.username ? `/artist/${creator.username}` : '#'"
            class="surface p-4 flex items-center gap-3"
          >
            <img
              :src="avatarImage(creator.avatarCid, creator.id)"
              :alt="creator.displayName ?? creator.username ?? ''"
              class="w-12 h-12 rounded-full object-cover shrink-0"
            >
            <div class="min-w-0">
              <p class="text-foreground text-sm font-medium truncate">
                {{ creator.displayName ?? creator.username }}
              </p>
              <p v-if="creator.username" class="text-muted text-xs truncate">@{{ creator.username }}</p>
            </div>
          </NuxtLink>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Collection } from '~/types/collection'
import type { PublicListing } from '~/types/marketplace'

interface SearchCreator {
  id: string
  username: string | null
  displayName: string | null
  bio: string | null
  avatarCid: string | null
  isVerified: boolean
  createdAt: string
}

interface SearchResults {
  assets: PublicListing[]
  creators: SearchCreator[]
  collections: Collection[]
}

useHead({ title: 'Recherche' })

const route = useRoute()
const router = useRouter()
const api = useApi()

const q = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))
const term = ref(q.value)

// The URL is the source of truth so a result page can be shared or reloaded.
// Debounced to avoid one request (and one history entry) per keystroke.
let timer: ReturnType<typeof setTimeout> | undefined
watch(term, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (value === q.value) return
    router.replace({ path: '/search', query: value ? { q: value } : {} })
  }, 300)
})

// Keeps the box in sync when the term changes from outside (topbar, back button).
watch(q, (value) => { term.value = value })

const { data, error } = await useAsyncData(
  () => `search-${q.value}`,
  () => (q.value
    ? api.get<SearchResults>(`/search?q=${encodeURIComponent(q.value)}`)
    : Promise.resolve(null)),
  { watch: [q] },
)

const results = computed<SearchResults>(() => data.value ?? { assets: [], creators: [], collections: [] })
const isEmpty = computed(() =>
  results.value.assets.length === 0
  && results.value.creators.length === 0
  && results.value.collections.length === 0,
)
</script>
