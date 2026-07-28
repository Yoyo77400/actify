<template>
  <div class="flex flex-col gap-7">
    <div class="flex flex-col gap-1">
      <h1 class="ethnocentric text-foreground text-2xl">Artistes</h1>
      <p class="text-muted text-sm">Les créateurs que vous suivez.</p>
    </div>

    <ArtistTabs />

    <section class="flex flex-col gap-4">
      <div class="relative max-w-[360px]">
        <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
        <input
          v-model.trim="q"
          type="search"
          placeholder="Rechercher dans mes abonnements..."
          class="input !pl-10"
          aria-label="Rechercher dans mes abonnements"
        >
      </div>

      <p v-if="errorMsg" class="surface p-4 text-danger text-sm" role="alert">{{ errorMsg }}</p>

      <div v-if="creators.length" class="grid grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
        <ArtistDirectoryCard
          v-for="creator in creators"
          :key="creator.id"
          :creator="creator"
          :can-follow="true"
          :toggling="togglingId === creator.id"
          @toggle="unfollow(creator)"
        />
      </div>

      <div v-else-if="!loading && !errorMsg" class="surface p-10 flex flex-col items-center gap-3 text-center">
        <Icon name="ph:heart" class="text-3xl text-muted-2" />
        <p class="text-foreground font-medium">
          {{ hasQuery ? 'Aucun abonnement ne correspond à cette recherche.' : "Vous ne suivez encore aucun artiste." }}
        </p>
        <NuxtLink v-if="!hasQuery" to="/artists" class="text-accent text-sm hover:underline">
          Découvrir des artistes
        </NuxtLink>
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
import type { CreatorCard } from '~/types/marketplace'

const PAGE_SIZE = 12

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mes abonnements' })

const follows = useFollows()

const q = ref('')
const hasQuery = computed(() => q.value.length > 0)
const page = ref(1)
const loading = ref(false)
const reachedEnd = ref(false)
const errorMsg = ref<string | null>(null)

function buildParams() {
  return { q: q.value || undefined, page: page.value, limit: PAGE_SIZE }
}

const { data: firstPage, error: firstError } = await useAsyncData('artists-following', () =>
  follows.list(buildParams()),
)

const creators = ref<CreatorCard[]>(firstPage.value ?? [])
reachedEnd.value = (firstPage.value?.length ?? 0) < PAGE_SIZE
if (firstError.value) {
  errorMsg.value = toApiError(firstError.value)?.message ?? 'Impossible de charger vos abonnements.'
}

let requestSeq = 0
async function fetchPage(reset: boolean) {
  const seq = ++requestSeq
  loading.value = true
  errorMsg.value = null
  try {
    const batch = await follows.list(buildParams())
    if (seq !== requestSeq) return
    creators.value = reset ? batch : [...creators.value, ...batch]
    reachedEnd.value = batch.length < PAGE_SIZE
  } catch (err) {
    if (seq !== requestSeq) return
    errorMsg.value = toApiError(err)?.message ?? 'Impossible de charger vos abonnements.'
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

const togglingId = ref<string | null>(null)
async function unfollow(creator: CreatorCard) {
  if (!creator.username || togglingId.value) return
  togglingId.value = creator.id
  try {
    await follows.unfollow(creator.username)
    // This list is "who I follow" by construction — once unfollowed, the
    // row no longer belongs here.
    creators.value = creators.value.filter((c) => c.id !== creator.id)
  } catch {
    // Best-effort: on failure the row simply stays.
  } finally {
    togglingId.value = null
  }
}
</script>
