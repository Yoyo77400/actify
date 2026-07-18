<template>
  <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-line last:border-b-0">
    <div class="flex items-center gap-3 min-w-0">
      <!-- The admin serializer exposes no thumbnail — neutral tile instead of a fake image. -->
      <div class="w-9 h-9 rounded-[8px] bg-panel-3 border border-line grid place-items-center shrink-0">
        <Icon name="ph:cube" class="text-muted" />
      </div>
      <div class="min-w-0">
        <p class="m-0 text-sm font-medium truncate">{{ asset.title }}</p>
        <p class="m-0 text-xs text-muted-2 mt-0.5">
          par {{ sellerName }} · créé le {{ createdLabel }} · {{ asset.viewsCount }} vues · {{ asset.salesCount }} ventes
        </p>
      </div>
    </div>

    <div class="flex items-center gap-3 shrink-0">
      <span class="text-sm font-semibold whitespace-nowrap">{{ priceLabel }}</span>
      <span class="pill-badge text-xs" :class="statusBadge">{{ statusLabel }}</span>
      <span
        v-if="asset.deletedAt"
        class="pill-badge text-xs bg-danger/12 text-danger border-danger/20"
      >
        Supprimé
      </span>

      <div class="relative">
        <button
          class="ghost-btn w-8 h-8 !p-0 flex items-center justify-center"
          type="button"
          aria-label="Actions asset"
          @click="menuOpen = !menuOpen"
        >
          <Icon name="ph:dots-three-vertical" />
        </button>
        <div v-if="menuOpen" class="admin-dropdown" @mouseleave="menuOpen = false">
          <button
            v-if="asset.status !== 'Published'"
            class="admin-dropdown-item text-success"
            type="button"
            @click="emit('set-status', asset.id, 'Published'); menuOpen = false"
          >
            Publier
          </button>
          <button
            v-if="asset.status !== 'Suspended'"
            class="admin-dropdown-item text-warning"
            type="button"
            @click="emit('set-status', asset.id, 'Suspended'); menuOpen = false"
          >
            Suspendre
          </button>
          <button
            v-if="asset.status !== 'Archived'"
            class="admin-dropdown-item"
            type="button"
            @click="emit('set-status', asset.id, 'Archived'); menuOpen = false"
          >
            Archiver
          </button>
          <button
            v-if="!asset.deletedAt"
            class="admin-dropdown-item text-danger"
            type="button"
            @click="emit('remove', asset.id); menuOpen = false"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminAsset, AdminAssetStatus } from '~/types/admin'

const props = defineProps<{ asset: AdminAsset }>()
const emit = defineEmits<{
  'set-status': [id: string, status: AdminAssetStatus]
  'remove': [id: string]
}>()

const menuOpen = ref(false)

const STATUS_LABELS: Record<AdminAssetStatus, string> = {
  Draft: 'Brouillon',
  Published: 'Publié',
  Archived: 'Archivé',
  Suspended: 'Suspendu',
}

const statusLabel = computed(() => STATUS_LABELS[props.asset.status] ?? props.asset.status)

const sellerName = computed(() => {
  const { displayName, username, id } = props.asset.seller
  return displayName || username || `${id.slice(0, 6)}…`
})

const priceLabel = computed(() => {
  if (props.asset.isFree) return 'Gratuit'
  if (!props.asset.price) return '—'
  return props.asset.currency ? `${props.asset.price} ${props.asset.currency}` : props.asset.price
})

// Pinned timezone: SSR-rendered, keep server and client output identical.
const createdLabel = computed(() =>
  new Date(props.asset.createdAt).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }),
)

const statusBadge = computed(() => ({
  'bg-success/12 text-success border-success/20': props.asset.status === 'Published',
  'bg-muted/12 text-muted border-muted/20': props.asset.status === 'Draft' || props.asset.status === 'Archived',
  'bg-warning/12 text-warning border-warning/20': props.asset.status === 'Suspended',
}))
</script>
