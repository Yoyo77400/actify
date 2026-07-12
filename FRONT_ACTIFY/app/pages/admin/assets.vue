<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
      <div>
        <h1 class="ethnocentric m-0 text-2xl">Assets</h1>
        <p class="mt-1 mb-0 text-muted text-sm">{{ total }} digital assets</p>
      </div>
      <AdminSearchBar v-model="store.search" placeholder="Search assets..." />
    </div>

    <div class="flex gap-2 scroll-x">
      <button
        v-for="f in filters"
        :key="f.value"
        class="chip shrink-0"
        :class="{ 'chip--active': store.assetFilter === f.value }"
        type="button"
        @click="store.assetFilter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <div class="surface overflow-hidden">
      <AdminAssetRow
        v-for="asset in filtered"
        :key="asset.id"
        :asset="asset"
        @flag="onFlag"
        @remove="onRemove"
        @restore="onRestore"
      />
      <AdminEmptyState v-if="!filtered.length" message="No assets match your filters" icon="ph:cube" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { adminFlagAsset, adminRemoveAsset, adminRestoreAsset } from '~/composables/useAdminApi'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Assets' })

const store = useAdminStore()
const { data } = await useAdminAssets()
const total = computed(() => data.value.total)
const filtered = computed(() => store.filterAssets(data.value.assets))

const filters = [
  { label: 'All', value: 'all' as const },
  { label: 'Listed', value: 'listed' as const },
  { label: 'Unlisted', value: 'unlisted' as const },
  { label: 'Flagged', value: 'flagged' as const },
  { label: 'Removed', value: 'removed' as const },
]

function onFlag(id: string) {
  store.requestConfirm('Flag this asset for review? It will be hidden from search.', () => adminFlagAsset(id))
}
function onRemove(id: string) {
  store.requestConfirm('Remove this asset from the platform?', () => adminRemoveAsset(id))
}
function onRestore(id: string) {
  store.requestConfirm('Restore this asset? It will be visible again.', () => adminRestoreAsset(id))
}
</script>