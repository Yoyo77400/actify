<template>
  <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-line last:border-b-0">
    <div class="flex items-center gap-3 min-w-0">
      <img class="w-9 h-9 rounded-[8px] object-cover shrink-0" :src="sale.assetImage" :alt="sale.assetName" />
      <div class="min-w-0">
        <p class="m-0 text-sm font-medium truncate">{{ sale.assetName }}</p>
        <p class="m-0 text-xs text-muted-2 mt-0.5">{{ sale.seller }} → {{ sale.buyer }}</p>
      </div>
    </div>

    <div class="flex items-center gap-3 shrink-0">
      <span class="text-sm font-semibold whitespace-nowrap">{{ sale.price }} {{ sale.currency }}</span>
      <span class="pill-badge text-xs" :class="statusBadge">{{ sale.status }}</span>
      <span class="text-xs text-muted font-mono hidden lg:block">{{ sale.txHash }}</span>

      <div class="relative">
        <button
          class="ghost-btn w-8 h-8 !p-0 flex items-center justify-center"
          type="button"
          @click="menuOpen = !menuOpen"
        >
          <Icon name="ph:dots-three-vertical" />
        </button>
        <div v-if="menuOpen" class="admin-dropdown" @mouseleave="menuOpen = false">
          <button
            v-if="sale.status === 'pending' || sale.status === 'disputed'"
            class="admin-dropdown-item"
            type="button"
            @click="emit('cancel', sale.id); menuOpen = false"
          >
            Cancel sale
          </button>
          <button
            v-if="sale.status === 'completed' || sale.status === 'disputed'"
            class="admin-dropdown-item text-warning"
            type="button"
            @click="emit('refund', sale.id); menuOpen = false"
          >
            Refund
          </button>
          <button
            class="admin-dropdown-item text-danger"
            type="button"
            @click="emit('delete', sale.id); menuOpen = false"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminSale } from '~/types/admin'

const props = defineProps<{ sale: AdminSale }>()
const emit = defineEmits<{
  cancel: [id: string]
  refund: [id: string]
  delete: [id: string]
}>()

const menuOpen = ref(false)

const statusBadge = computed(() => ({
  'bg-success/12 text-success border-success/20': props.sale.status === 'completed',
  'bg-warning/12 text-warning border-warning/20': props.sale.status === 'pending',
  'bg-danger/12 text-danger border-danger/20': props.sale.status === 'disputed',
  'bg-muted/12 text-muted border-muted/20': props.sale.status === 'cancelled' || props.sale.status === 'refunded',
}))
</script>