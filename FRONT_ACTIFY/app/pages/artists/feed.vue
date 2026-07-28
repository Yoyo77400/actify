<template>
  <div class="flex flex-col gap-7">
    <div class="flex flex-col gap-1">
      <h1 class="ethnocentric text-foreground text-2xl">Artistes</h1>
      <p class="text-muted text-sm">Parcourez les derniers assets de vos artistes suivis.</p>
    </div>

    <ArtistTabs />

    <p v-if="errorMsg" class="surface p-4 text-danger text-sm" role="alert">{{ errorMsg }}</p>

    <div v-else-if="!items.length && !loading" class="surface p-10 flex flex-col items-center gap-3 text-center">
      <Icon name="ph:cards" class="text-3xl text-muted-2" />
      <p class="text-foreground font-medium">Rien à afficher pour le moment</p>
      <p class="text-muted text-sm">
        Suivez des artistes pour voir leurs nouveautés apparaître ici.
        <NuxtLink to="/artists" class="text-accent hover:underline">Découvrir des artistes</NuxtLink>
      </p>
    </div>

    <div v-else class="grid grid-cols-4 max-xl:grid-cols-3 max-md:grid-cols-2 gap-1">
      <NuxtLink
        v-for="asset in items"
        :key="asset.id"
        :to="`/assets/${asset.slug ?? asset.id}`"
        class="feed-tile"
      >
        <img :src="thumbnailUrl(asset)" :alt="asset.title" class="feed-tile-image" loading="lazy">

        <button
          type="button"
          class="feed-like-btn"
          :class="{ 'feed-like-btn--active': likedIds.has(asset.id) }"
          :aria-label="likedIds.has(asset.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'"
          @click.stop.prevent="toggleLike(asset)"
        >
          <Icon :name="likedIds.has(asset.id) ? 'ph:heart-fill' : 'ph:heart'" class="text-base" />
        </button>

        <div class="feed-tile-overlay">
          <p class="text-white text-xs font-medium truncate">{{ asset.title }}</p>
          <p class="text-white/75 text-[11px]">{{ priceLabel(asset) }}</p>
        </div>
      </NuxtLink>
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
import type { AssetCard } from '~/types/asset'

const PAGE_SIZE = 12

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Feed · Artistes' })

const follows = useFollows()
const favorites = useFavorites()

const items = ref<AssetCard[]>([])
const page = ref(1)
const loading = ref(false)
const reachedEnd = ref(false)
const errorMsg = ref<string | null>(null)
const likedIds = ref<Set<string>>(new Set())

async function fetchPage(reset: boolean) {
  if (loading.value || (reachedEnd.value && !reset)) return
  loading.value = true
  errorMsg.value = null
  try {
    const batch = await follows.feed({ page: page.value, limit: PAGE_SIZE })
    items.value = reset ? batch : [...items.value, ...batch]
    reachedEnd.value = batch.length < PAGE_SIZE
  } catch (err) {
    errorMsg.value = toApiError(err)?.message
      ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Impossible de charger le feed.')
  } finally {
    loading.value = false
  }
}

await fetchPage(true)

function loadMore() {
  page.value += 1
  fetchPage(false)
}

function priceLabel(asset: AssetCard): string {
  if (asset.isFree) return 'Gratuit'
  if (!asset.price) return '—'
  return asset.currency ? `${asset.price} ${asset.currency}` : asset.price
}
function thumbnailUrl(asset: AssetCard): string {
  return assetImage(asset.thumbnailCid, asset.id)
}

async function toggleLike(asset: AssetCard) {
  const liked = likedIds.value.has(asset.id)
  try {
    if (liked) {
      await favorites.remove(asset.id)
      likedIds.value.delete(asset.id)
    } else {
      await favorites.add(asset.id)
      likedIds.value.add(asset.id)
    }
    // Set mutations aren't tracked by Vue's reactivity - swap the reference.
    likedIds.value = new Set(likedIds.value)
  } catch {
    // Best-effort: on failure the heart simply stays as it was.
  }
}
</script>

<style scoped>
/* Instagram-style grid: the page scrolls normally (no boxed inner
   scrollbar) and each tile is a square, so the row uses both the full
   width and height of the viewport instead of one tall card at a time. */
.feed-tile {
  position: relative;
  display: block;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--color-panel-3);
}
.feed-tile-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}
.feed-tile:hover .feed-tile-image {
  transform: scale(1.04);
}
.feed-tile-overlay {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding: 8px 10px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
}
.feed-like-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
  transition: background-color 0.15s ease, color 0.15s ease;
}
.feed-like-btn--active {
  background: rgba(224, 36, 36, 0.9);
  border-color: transparent;
}
</style>
