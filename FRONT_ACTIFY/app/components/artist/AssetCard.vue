<template>
  <article class="surface overflow-hidden">
    <NuxtLink :to="assetLink">
      <img
        class="w-full h-[230px] object-cover bg-panel-3"
        :src="assetImage(item.thumbnailCid, item.id)"
        :alt="item.title"
        loading="lazy"
      >
    </NuxtLink>

    <div class="p-3.5">
      <h3 class="ethnocentric m-0 text-base line-clamp-1">{{ item.title }}</h3>
      <p class="mt-2 mb-3 text-muted text-[13px] min-h-[40px] line-clamp-2">
        {{ item.shortDescription ?? item.description ?? '' }}
      </p>

      <div class="flex items-center justify-between gap-3">
        <strong class="text-sm" :class="item.isFree ? 'text-success' : 'text-foreground'">
          {{ priceLabel }}
        </strong>
        <span class="text-muted-2 text-xs inline-flex items-center gap-1">
          <Icon name="ph:eye" class="text-sm" />
          {{ item.viewsCount }}
        </span>
      </div>

      <!-- Purchase happens on the asset detail page (order + XRPL payment flow). -->
      <NuxtLink :to="assetLink" class="secondary-btn inline-flex items-center justify-center w-full mt-3">
        Voir
      </NuxtLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { PublicListing } from '~/types/marketplace'

const props = defineProps<{
  item: PublicListing
}>()

const assetLink = computed(() => `/assets/${props.item.slug ?? props.item.id}`)

const priceLabel = computed(() => {
  if (props.item.isFree) return 'Gratuit'
  if (!props.item.price) return '—'
  return props.item.currency ? `${props.item.price} ${props.item.currency}` : props.item.price
})
</script>
