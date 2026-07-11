<template>
  <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-line last:border-b-0">
    <div class="flex items-center gap-3 min-w-0">
      <img class="w-9 h-9 rounded-[8px] object-cover shrink-0" :src="asset.image" :alt="asset.name" >
      <div class="min-w-0">
        <p class="m-0 text-sm font-medium truncate">{{ asset.name }}</p>
        <p class="m-0 text-xs text-muted-2 mt-0.5">{{ asset.creator }} · {{ asset.collection }}</p>
      </div>
    </div>

    <div class="flex items-center gap-3 shrink-0">
      <span class="text-sm font-semibold whitespace-nowrap">{{ asset.price }} {{ asset.currency }}</span>
      <span class="pill-badge text-xs" :class="statusBadge">{{ asset.status }}</span>
      <span
        v-if="asset.reportCount > 0"
        class="pill-badge text-xs bg-danger/12 text-danger border-danger/20"
      >
        {{ asset.reportCount }} report{{ asset.reportCount > 1 ? 's' : '' }}
      </span>

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
            v-if="asset.status === 'listed' || asset.status === 'unlisted'"
            class="admin-dropdown-item text-warning"
            type="button"
            @click="emit('flag', asset.id); menuOpen = false"
          >
            Flag
          </button>
          <button
            v-if="asset.status !== 'removed'"
            class="admin-dropdown-item text-danger"
            type="button"
            @click="emit('remove', asset.id); menuOpen = false"
          >
            Remove
          </button>
          <button
            v-if="asset.status === 'flagged' || asset.status === 'removed'"
            class="admin-dropdown-item text-success"
            type="button"
            @click="emit('restore', asset.id); menuOpen = false"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminAsset } from '~/types/admin'

const props = defineProps<{ asset: AdminAsset }>()
const emit = defineEmits<{
  flag: [id: string]
  remove: [id: string]
  restore: [id: string]
}>()

const menuOpen = ref(false)

const statusBadge = computed(() => ({
  'bg-success/12 text-success border-success/20': props.asset.status === 'listed',
  'bg-muted/12 text-muted border-muted/20': props.asset.status === 'unlisted',
  'bg-warning/12 text-warning border-warning/20': props.asset.status === 'flagged',
  'bg-danger/12 text-danger border-danger/20': props.asset.status === 'removed',
}))
</script>