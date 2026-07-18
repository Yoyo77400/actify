<template>
  <!-- Read-only row: the API exposes no admin action on orders (no cancel/refund/delete). -->
  <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-line last:border-b-0">
    <div class="min-w-0">
      <NuxtLink
        :to="`/assets/${order.listing.slug ?? order.listing.id}`"
        class="m-0 text-sm font-medium truncate block text-foreground no-underline hover:underline"
      >
        {{ order.listing.title }}
      </NuxtLink>
      <p class="m-0 text-xs text-muted-2 mt-0.5">
        acheté par {{ buyerName }} · {{ purchasedLabel }}
      </p>
    </div>

    <div class="flex items-center gap-3 shrink-0">
      <span class="text-sm font-semibold whitespace-nowrap">{{ order.amountPaid }}</span>
      <span class="pill-badge text-xs" :class="statusBadge">{{ statusLabel }}</span>
      <span v-if="order.txHash" class="text-xs text-muted font-mono hidden lg:block" :title="order.txHash">
        {{ shortTxHash }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminOrder, AdminOrderStatus } from '~/types/admin'

const props = defineProps<{ order: AdminOrder }>()

const STATUS_LABELS: Record<AdminOrderStatus, string> = {
  Pending: 'En attente',
  Confirmed: 'Confirmée',
  Cancelled: 'Annulée',
}

const statusLabel = computed(() => STATUS_LABELS[props.order.status] ?? props.order.status)

const buyerName = computed(() => {
  const { displayName, username, id } = props.order.buyer
  return displayName || username || `${id.slice(0, 6)}…`
})

// Pinned timezone: these rows are SSR-rendered and the server may not run in
// Europe/Paris — a floating local timezone would break hydration.
const purchasedLabel = computed(() =>
  new Date(props.order.purchasedAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
)

const shortTxHash = computed(() => {
  const hash = props.order.txHash
  if (!hash) return ''
  return hash.length > 18 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash
})

const statusBadge = computed(() => ({
  'bg-success/12 text-success border-success/20': props.order.status === 'Confirmed',
  'bg-warning/12 text-warning border-warning/20': props.order.status === 'Pending',
  'bg-muted/12 text-muted border-muted/20': props.order.status === 'Cancelled',
}))
</script>
