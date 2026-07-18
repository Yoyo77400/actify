<template>
  <div class="flex flex-col gap-5">
    <!-- No search bar: GET /admin/assets has no text-search param (status/sellerId only). -->
    <div>
      <h1 class="ethnocentric m-0 text-2xl">Assets</h1>
      <p class="mt-1 mb-0 text-muted text-sm">{{ meta?.total ?? 0 }} assets numériques</p>
    </div>

    <div class="flex gap-2 scroll-x">
      <button
        v-for="f in filters"
        :key="f.label"
        class="chip shrink-0"
        :class="{ 'chip--active': filter === f.value }"
        type="button"
        @click="filter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <p v-if="errorMsg" class="surface p-4 text-danger text-sm" role="alert">{{ errorMsg }}</p>

    <div class="surface overflow-hidden">
      <AdminAssetRow
        v-for="asset in assets"
        :key="asset.id"
        :asset="asset"
        @set-status="onSetStatus"
        @remove="onRemove"
      />
      <AdminEmptyState
        v-if="!assets.length && !loading && !errorMsg"
        message="Aucun asset ne correspond aux filtres"
        icon="ph:cube"
      />
    </div>

    <div v-if="loading" class="flex justify-center py-4">
      <span class="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>

    <div v-if="meta && meta.totalPages > 1" class="flex items-center justify-center gap-3 pt-2">
      <button type="button" class="ghost-btn text-sm" :disabled="page <= 1 || loading" @click="goToPage(page - 1)">
        Précédent
      </button>
      <span class="text-muted text-sm">Page {{ meta.page }} / {{ meta.totalPages }}</span>
      <button
        type="button"
        class="ghost-btn text-sm"
        :disabled="page >= meta.totalPages || loading"
        @click="goToPage(page + 1)"
      >
        Suivant
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminAsset, AdminAssetStatus, PageMeta } from '~/types/admin'
import type { AdminAssetListParams } from '~/composables/useAdminApi'

const PAGE_SIZE = 20

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Assets' })

const adminApi = useAdminApi()
const store = useAdminStore()

const filter = ref<AdminAssetStatus | undefined>(undefined)
const page = ref(1)

const assets = ref<AdminAsset[]>([])
const meta = ref<PageMeta | null>(null)
const loading = ref(false)
const errorMsg = ref<string | null>(null)

const filters: Array<{ label: string; value: AdminAssetStatus | undefined }> = [
  { label: 'Tous', value: undefined },
  { label: 'Brouillons', value: 'Draft' },
  { label: 'Publiés', value: 'Published' },
  { label: 'Suspendus', value: 'Suspended' },
  { label: 'Archivés', value: 'Archived' },
]

function buildParams(): AdminAssetListParams {
  return { status: filter.value, page: page.value, limit: PAGE_SIZE }
}

// Monotonic token: discard stale responses after a filter change mid-flight.
let requestSeq = 0

async function fetchAssets() {
  const seq = ++requestSeq
  loading.value = true
  errorMsg.value = null
  try {
    const result = await adminApi.listAssets(buildParams())
    if (seq !== requestSeq) return
    // A mutation can empty the last page (page index now past totalPages):
    // clamp and refetch instead of showing a fake "no results" state. The
    // recursive call bumps requestSeq, so this stale response is discarded and
    // the inner fetch takes over the loading flag.
    const lastPage = Math.max(1, result.meta.totalPages)
    if (!result.items.length && lastPage < page.value) {
      page.value = lastPage
      fetchAssets()
      return
    }
    assets.value = result.items
    meta.value = result.meta
  } catch (err) {
    if (seq !== requestSeq) return
    errorMsg.value = toApiError(err)?.message
      ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Impossible de charger les assets.')
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

const { data: first } = await useAsyncData('admin-assets', async () => {
  try {
    return { ok: true as const, ...(await adminApi.listAssets(buildParams())) }
  } catch (err) {
    return {
      ok: false as const,
      message: toApiError(err)?.message
        ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Impossible de charger les assets.'),
    }
  }
})
if (first.value?.ok) {
  assets.value = first.value.items
  meta.value = first.value.meta
} else if (first.value) {
  errorMsg.value = first.value.message
}

watch(filter, () => {
  page.value = 1
  fetchAssets()
})

function goToPage(target: number) {
  page.value = target
  fetchAssets()
}

async function run(action: () => Promise<unknown>) {
  try {
    await action()
    await fetchAssets()
  } catch (err) {
    errorMsg.value = toApiError(err)?.message ?? "L'action a échoué."
  }
}

// Status changes are reversible → applied directly; deletion goes through the
// confirm modal.
function onSetStatus(id: string, status: AdminAssetStatus) {
  run(() => adminApi.updateAssetStatus(id, status))
}

function onRemove(id: string) {
  store.requestConfirm(
    'Supprimer cet asset ? Il sera archivé et marqué comme supprimé.',
    () => run(() => adminApi.removeAsset(id)),
  )
}
</script>
