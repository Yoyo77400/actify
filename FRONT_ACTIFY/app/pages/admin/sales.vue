<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
      <div>
        <h1 class="ethnocentric m-0 text-2xl">Ventes</h1>
        <p class="mt-1 mb-0 text-muted text-sm">{{ meta?.total ?? 0 }} commande{{ (meta?.total ?? 0) > 1 ? 's' : '' }}</p>
      </div>
      <AdminSearchBar v-model="q" placeholder="Rechercher (acheteur, asset, tx hash)..." />
    </div>

    <div class="flex items-center justify-between gap-4 flex-wrap">
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
      <AdminDateRangeFilter v-model="dateRange" />
    </div>

    <p v-if="errorMsg" class="surface p-4 text-danger text-sm" role="alert">{{ errorMsg }}</p>

    <div class="surface overflow-hidden">
      <AdminSaleRow v-for="order in orders" :key="order.id" :order="order" />
      <AdminEmptyState
        v-if="!orders.length && !loading && !errorMsg"
        message="Aucune commande ne correspond aux filtres"
        icon="ph:receipt"
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
import type { DateRangeValue } from '~/components/admin/AdminDateRangeFilter.vue'
import type { AdminOrder, AdminOrderStatus, PageMeta } from '~/types/admin'
import type { AdminOrderListParams } from '~/composables/useAdminApi'

const PAGE_SIZE = 20

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Ventes' })

const adminApi = useAdminApi()

const q = ref('')
const filter = ref<AdminOrderStatus | undefined>(undefined)
const dateRange = ref<DateRangeValue>({})
const page = ref(1)

const orders = ref<AdminOrder[]>([])
const meta = ref<PageMeta | null>(null)
const loading = ref(false)
const errorMsg = ref<string | null>(null)

const filters: Array<{ label: string; value: AdminOrderStatus | undefined }> = [
  { label: 'Toutes', value: undefined },
  { label: 'En attente', value: 'Pending' },
  { label: 'Confirmées', value: 'Confirmed' },
  { label: 'Annulées', value: 'Cancelled' },
]

function buildParams(): AdminOrderListParams {
  return {
    status: filter.value,
    q: q.value || undefined,
    from: dateRange.value.from,
    to: dateRange.value.to,
    page: page.value,
    limit: PAGE_SIZE,
  }
}

// Monotonic token: discard stale responses after a filter change mid-flight.
let requestSeq = 0

async function fetchOrders() {
  const seq = ++requestSeq
  loading.value = true
  errorMsg.value = null
  try {
    const result = await adminApi.listOrders(buildParams())
    if (seq !== requestSeq) return
    orders.value = result.items
    meta.value = result.meta
  } catch (err) {
    if (seq !== requestSeq) return
    errorMsg.value = toApiError(err)?.message
      ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Impossible de charger les commandes.')
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

const { data: first } = await useAsyncData('admin-orders', async () => {
  try {
    return { ok: true as const, ...(await adminApi.listOrders(buildParams())) }
  } catch (err) {
    return {
      ok: false as const,
      message: toApiError(err)?.message
        ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Impossible de charger les commandes.'),
    }
  }
})
if (first.value?.ok) {
  orders.value = first.value.items
  meta.value = first.value.meta
} else if (first.value) {
  errorMsg.value = first.value.message
}

watch([filter, dateRange], () => {
  page.value = 1
  fetchOrders()
})

// Debounce keystrokes so typing doesn't fire one request per character.
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(q, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    fetchOrders()
  }, 300)
})

function goToPage(target: number) {
  page.value = target
  fetchOrders()
}
</script>
