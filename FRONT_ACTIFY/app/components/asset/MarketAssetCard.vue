<template>
  <NuxtLink
    :to="`/assets/${asset.slug ?? asset.id}`"
    class="surface overflow-hidden flex flex-col transition-colors hover:border-line-strong"
  >
    <div class="relative">
      <img
        class="w-full h-[200px] object-cover bg-panel-3"
        :src="thumbnailUrl"
        :alt="asset.title"
        loading="lazy"
      >
      <span
        v-if="asset.tokenized"
        class="pill-badge absolute top-2.5 right-2.5 text-accent-2 bg-black/60"
      >
        <Icon name="ph:seal-check" class="text-sm" />
        NFT
      </span>
    </div>

    <div class="p-3.5 flex flex-col gap-2 flex-1">
      <div v-if="asset.categories.length" class="flex flex-wrap gap-1.5">
        <span
          v-for="cat in asset.categories.slice(0, 2)"
          :key="cat.id"
          class="rounded-full border border-line bg-panel-3 px-2 py-0.5 text-[11px] text-muted"
        >{{ cat.name }}</span>
      </div>

      <h3 class="ethnocentric m-0 text-sm line-clamp-1">{{ asset.title }}</h3>

      <p class="text-muted text-xs">par {{ sellerName }}</p>

      <div class="mt-auto pt-2 flex items-center justify-between gap-3">
        <strong class="text-sm" :class="asset.isFree ? 'text-success' : 'text-foreground'">
          {{ priceLabel }}
        </strong>
        <span class="text-muted-2 text-xs inline-flex items-center gap-1">
          <Icon name="ph:eye" class="text-sm" />
          {{ asset.viewsCount }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { AssetCard } from '~/types/asset'

const props = defineProps<{ asset: AssetCard }>()

const thumbnailUrl = computed(() => assetImage(props.asset.thumbnailCid, props.asset.id))

const sellerName = computed(() => {
  const { displayName, username, id } = props.asset.seller
  return displayName || username || `${id.slice(0, 6)}…`
})

const priceLabel = computed(() => {
  if (props.asset.isFree) return 'Gratuit'
  const { price, currency } = props.asset
  if (!price) return '—'
  return currency ? `${price} ${currency}` : price
})
</script>
