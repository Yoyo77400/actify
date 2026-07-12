<template>
  <article class="surface overflow-hidden">
    <NuxtLink :to="`/assets/${item.id}`">
      <img class="w-full h-[230px] object-cover bg-[#f1f3f7]" :src="item.image" :alt="item.name" >
    </NuxtLink>

    <div class="p-3.5">
      <h3 class="ethnocentric m-0 text-base">{{ item.name }}</h3>
      <p class="mt-2 mb-3 text-muted text-[13px] min-h-[40px]">{{ item.description }}</p>

      <div class="flex items-center justify-between gap-3">
        <span
          class="pill-badge"
          :class="item.active
            ? 'text-[#062012] bg-[rgba(42,255,135,0.85)] border-[rgba(42,255,135,0.85)]'
            : 'text-white bg-[rgba(255,91,106,0.2)] border-[rgba(255,91,106,0.4)]'"
        >
          {{ item.statusLabel }}
        </span>
        <strong>{{ item.price }}{{ item.currency }}</strong>
      </div>

      <div class="flex items-center justify-between gap-3 mt-3">
        <NuxtLink :to="`/assets/${item.id}`" class="secondary-btn inline-flex items-center justify-center w-full">
          View
        </NuxtLink>
        <button class="primary-btn inline-flex items-center justify-center w-full" type="button" :disabled="!item.active">
          Buy
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ArtistAsset } from '~/types/marketplace'

defineProps<{
  item: ArtistAsset
}>()
</script>
