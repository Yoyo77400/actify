<template>
  <div class="flex flex-col gap-7">
    <!-- Not found -->
    <div v-if="loadError?.notFound" class="surface p-10 flex flex-col items-center gap-3 text-center">
      <Icon name="ph:magnifying-glass" class="text-3xl text-muted" />
      <h1 class="ethnocentric text-foreground text-lg">Artiste introuvable</h1>
      <p class="text-muted text-sm max-w-sm">Ce profil n'existe pas ou a été supprimé.</p>
      <NuxtLink to="/assets" class="primary-btn mt-2">Explorer le marketplace</NuxtLink>
    </div>

    <!-- Generic load error -->
    <div v-else-if="loadError" class="surface p-10 flex flex-col items-center gap-3 text-center">
      <Icon name="ph:warning-circle" class="text-3xl text-danger" />
      <h1 class="ethnocentric text-foreground text-lg">Chargement impossible</h1>
      <p class="text-muted text-sm max-w-sm" role="alert">{{ loadError.message }}</p>
      <button type="button" class="primary-btn mt-2" @click="refresh()">Réessayer</button>
    </div>

    <template v-else-if="artist">
      <ArtistHeader :artist="artist" />

      <section class="grid grid-cols-[250px_minmax(0,1fr)] max-lg:grid-cols-1 gap-[18px]">
        <ArtistProfileSidebar :artist="artist" />

        <div>
          <CommonSectionHeader
            title="Assets publiés"
            :subtitle="`${artist.stats.listingsCount} au total`"
          />

          <p v-if="itemsError" class="surface p-4 text-danger text-sm" role="alert">{{ itemsError }}</p>

          <div
            v-if="items.length"
            class="grid grid-cols-3 max-xl:grid-cols-2 max-md:grid-cols-1 gap-4 items-start"
          >
            <ArtistAssetCard v-for="item in items" :key="item.id" :item="item" />
          </div>

          <div v-else-if="!loading && !itemsError" class="surface p-10 flex flex-col items-center gap-3 text-center">
            <Icon name="ph:package" class="text-3xl text-muted-2" />
            <p class="text-muted text-sm">Cet artiste n'a pas encore publié d'asset.</p>
          </div>

          <div v-if="loading" class="flex justify-center py-4">
            <span class="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>

          <div v-if="items.length && !reachedEnd" class="flex justify-center pt-4">
            <button type="button" class="secondary-btn" :disabled="loading" @click="loadMore">
              Charger plus
            </button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PublicListing, PublicProfile } from '~/types/marketplace'

interface LoadFailure {
  notFound: boolean
  message: string
}

type LoadResult =
  | { ok: true; profile: PublicProfile; firstPage: PublicListing[] }
  | { ok: false; error: LoadFailure }

const PAGE_SIZE = 12

const route = useRoute()
const marketplace = useMarketplaceApi()

// The artist slug IS the username (see the /artist/:username/items links
// generated from asset.seller.username on the asset detail page).
const username = String(route.params.slug)

// Profile + first page fetched together during SSR; a 404 on either means the
// user doesn't exist. Errors normalized in the handler so toApiError sees the
// raw FetchError.
const { data, refresh } = await useAsyncData<LoadResult>(`artist:${username}`, async () => {
  try {
    const [profile, firstPage] = await Promise.all([
      marketplace.profile(username),
      marketplace.profileAssets(username, { page: 1, limit: PAGE_SIZE }),
    ])
    return { ok: true, profile, firstPage }
  } catch (err) {
    const apiErr = toApiError(err)
    if (apiErr?.code === 'NOT_FOUND') {
      return { ok: false, error: { notFound: true, message: apiErr.message } }
    }
    return {
      ok: false,
      error: {
        notFound: false,
        message: apiErr?.message
          ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : "Impossible de charger le profil de l'artiste."),
      },
    }
  }
})

const artist = computed<PublicProfile | null>(() => {
  const d = data.value
  return d?.ok ? d.profile : null
})
const loadError = computed<LoadFailure | null>(() => {
  const d = data.value
  return d && !d.ok ? d.error : null
})

const items = ref<PublicListing[]>([])
const page = ref(1)
const loading = ref(false)
const itemsError = ref<string | null>(null)
// The endpoint returns no meta through useApi — infer the end from batch size,
// like pages/assets/index.vue.
const reachedEnd = ref(true)

// Re-seed the grid every time the initial load resolves, so a successful
// refresh() after an initial failure repopulates it. `immediate` reproduces the
// previous SSR output (no hydration mismatch).
watch(data, (d) => {
  if (d?.ok) {
    items.value = d.firstPage
    page.value = 1
    reachedEnd.value = d.firstPage.length < PAGE_SIZE
  }
}, { immediate: true })

async function loadMore() {
  loading.value = true
  itemsError.value = null
  try {
    // Commit `page` only after the fetch succeeds, so a failed attempt can be
    // retried without silently skipping a page.
    const next = page.value + 1
    const batch = await marketplace.profileAssets(username, { page: next, limit: PAGE_SIZE })
    items.value = [...items.value, ...batch]
    reachedEnd.value = batch.length < PAGE_SIZE
    page.value = next
  } catch (err) {
    itemsError.value = toApiError(err)?.message
      ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Impossible de charger plus d\'assets.')
  } finally {
    loading.value = false
  }
}

const artistName = computed(() => artist.value?.displayName ?? artist.value?.username ?? 'Artiste')

useHead(() => ({
  title: loadError.value?.notFound ? 'Artiste introuvable' : `Artiste ${artistName.value}`,
  meta: [{ name: 'description', content: `Assets publiés par ${artistName.value} sur Actify.` }],
}))
</script>
