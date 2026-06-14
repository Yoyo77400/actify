<template>
  <article class="surface overflow-hidden group cursor-pointer">
    <div class="relative h-[160px] overflow-hidden">
      <img
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        :src="collection.image"
        :alt="collection.name"
      />
    </div>
    <div class="p-3.5">
      <h3 class="ethnocentric m-0 text-sm">{{ collection.name }}</h3>
      <div class="flex justify-between mt-2 text-[13px]">
        <span class="text-muted">{{ collection.itemCount }} items</span>
        <span class="text-foreground font-medium">Floor {{ collection.floorPrice }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ProfileCollection } from '~/types/profile'

defineProps<{ collection: ProfileCollection }>()
</script>