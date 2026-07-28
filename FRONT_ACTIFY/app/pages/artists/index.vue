<template>
  <div class="flex flex-col gap-7">
    <div class="flex flex-col gap-1">
      <h1 class="ethnocentric text-foreground text-2xl">Artistes</h1>
      <p class="text-muted text-sm">Découvrez les créateurs de la communauté Actify et suivez vos préférés.</p>
    </div>

    <ArtistTabs />

    <section v-if="isLoggedIn && feedItems.length" class="flex flex-col gap-3">
      <CommonSectionHeader title="Derniers assets de vos artistes suivis" />
      <!-- Capped to ~2 rows regardless of column count (4/3/2/1 breakpoints) -
           the full scroll lives in the Feed tab. -->
      <div class="max-h-[630px] overflow-hidden">
        <div class="grid grid-cols-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
          <AssetMarketAssetCard v-for="asset in feedItems" :key="asset.id" :asset="asset" />
        </div>
      </div>
      <NuxtLink to="/artists/feed" class="secondary-btn w-fit self-center">
        Voir plus
      </NuxtLink>
    </section>

    <section class="flex flex-col gap-4">
      <CommonSectionHeader title="Tous les artistes" />

      <div class="relative max-w-[360px]">
        <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
        <input
          v-model.trim="q"
          type="search"
          placeholder="Rechercher un artiste..."
          class="input !pl-10"
          aria-label="Rechercher un artiste"
        >
      </div>

      <p v-if="errorMsg" class="surface p-4 text-danger text-sm" role="alert">{{ errorMsg }}</p>

      <div v-if="creators.length" class="grid grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
        <ArtistDirectoryCard
          v-for="creator in creators"
          :key="creator.id"
          :creator="creator"
          :can-follow="canFollow(creator)"
          :toggling="togglingId === creator.id"
          @toggle="toggleFollow(creator)"
        />
      </div>

      <div v-else-if="!loading && !errorMsg" class="surface p-10 flex flex-col items-center gap-3 text-center">
        <Icon name="ph:users" class="text-3xl text-muted-2" />
        <p class="text-foreground font-medium">Aucun artiste trouvé</p>
        <p class="text-muted text-sm">Essayez une autre recherche.</p>
      </div>

      <div v-if="loading" class="flex justify-center py-4">
        <span class="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>

      <div v-if="creators.length && !reachedEnd" class="flex justify-center pt-2">
        <button type="button" class="secondary-btn" :disabled="loading" @click="loadMore">
          Charger plus
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { AssetCard } from '~/types/asset'
import type { CreatorCard } from '~/types/marketplace'

const PAGE_SIZE = 12

useHead({ title: 'Artistes' })

const marketplace = useMarketplaceApi()
const follows = useFollows()
const { isLoggedIn } = useAuth()
const { canFollow, toggleFollow, togglingId } = useCreatorFollowToggle()

// A short preview, not a full paginated feed — this page's main job is the
// directory below; the "Suivis" section is a discovery shortcut.
const { data: feedItems } = await useAsyncData<AssetCard[]>(
  'artists-followed-feed',
  async () => {
    if (!isLoggedIn.value) return []
    try {
      return await follows.feed({ limit: 8 })
    } catch {
      return []
    }
  },
  { default: () => [] as AssetCard[] },
)

const q = ref('')
const page = ref(1)
const loading = ref(false)
const reachedEnd = ref(false)
const errorMsg = ref<string | null>(null)

function buildParams() {
  return { q: q.value || undefined, page: page.value, limit: PAGE_SIZE }
}

const { data: firstPage, error: firstError } = await useAsyncData('artists-directory', () =>
  marketplace.listCreators(buildParams()),
)

const creators = ref<CreatorCard[]>(firstPage.value ?? [])
reachedEnd.value = (firstPage.value?.length ?? 0) < PAGE_SIZE
if (firstError.value) {
  errorMsg.value = toApiError(firstError.value)?.message ?? 'Impossible de charger les artistes.'
}

let requestSeq = 0
async function fetchPage(reset: boolean) {
  const seq = ++requestSeq
  loading.value = true
  errorMsg.value = null
  try {
    const batch = await marketplace.listCreators(buildParams())
    if (seq !== requestSeq) return
    creators.value = reset ? batch : [...creators.value, ...batch]
    reachedEnd.value = batch.length < PAGE_SIZE
  } catch (err) {
    if (seq !== requestSeq) return
    errorMsg.value = toApiError(err)?.message ?? 'Impossible de charger les artistes.'
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function loadMore() {
  page.value += 1
  fetchPage(false)
}

// Debounce keystrokes so typing doesn't fire a request per character.
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(q, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    fetchPage(true)
  }, 300)
})
</script>
