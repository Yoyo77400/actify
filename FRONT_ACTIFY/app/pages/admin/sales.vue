<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
      <div>
        <h1 class="ethnocentric m-0 text-2xl">Sales</h1>
        <p class="mt-1 mb-0 text-muted text-sm">{{ total }} transactions</p>
      </div>
      <AdminSearchBar v-model="store.search" placeholder="Search sales..." />
    </div>

    <div class="flex gap-2 scroll-x">
      <button
        v-for="f in filters"
        :key="f.value"
        class="chip shrink-0"
        :class="{ 'chip--active': store.saleFilter === f.value }"
        type="button"
        @click="store.saleFilter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <div class="surface overflow-hidden">
      <AdminSaleRow
        v-for="sale in filtered"
        :key="sale.id"
        :sale="sale"
        @cancel="onCancel"
        @refund="onRefund"
        @delete="onDelete"
      />
      <AdminEmptyState v-if="!filtered.length" message="No sales match your filters" icon="ph:receipt" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { adminCancelSale, adminRefundSale, adminDeleteSale } from '~/composables/useAdminApi'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Sales' })

const store = useAdminStore()
const { data } = await useAdminSales()
const total = computed(() => data.value.total)
const filtered = computed(() => store.filterSales(data.value.sales))

const filters = [
  { label: 'All', value: 'all' as const },
  { label: 'Completed', value: 'completed' as const },
  { label: 'Pending', value: 'pending' as const },
  { label: 'Disputed', value: 'disputed' as const },
  { label: 'Cancelled', value: 'cancelled' as const },
  { label: 'Refunded', value: 'refunded' as const },
]

function onCancel(id: string) {
  store.requestConfirm('Cancel this sale?', () => adminCancelSale(id))
}
function onRefund(id: string) {
  store.requestConfirm('Refund this sale? Funds will be returned to the buyer.', () => adminRefundSale(id))
}
function onDelete(id: string) {
  store.requestConfirm('Permanently delete this sale record?', () => adminDeleteSale(id))
}
</script>