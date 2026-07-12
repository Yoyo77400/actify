<template>
  <article class="surface overflow-hidden">
    <img class="w-full h-[180px] object-cover" :src="item.image" :alt="item.name" >
    <div class="p-3.5">
      <h3 class="ethnocentric m-0 text-base">{{ item.name }}</h3>
      <p class="mt-2 mb-3.5 text-muted text-[13px]">{{ item.description }}</p>
      <button class="secondary-btn" type="button">{{ item.buttonLabel }}</button>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ArtistCollection } from '~/types/marketplace'

defineProps<{
  item: ArtistCollection
}>()
</script>
