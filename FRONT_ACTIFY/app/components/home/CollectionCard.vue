<template>
  <article class="surface overflow-hidden group cursor-pointer collection-card">
    <div class="h-[170px] overflow-hidden">
      <img
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        :src="item.image"
        :alt="item.name"
      />
    </div>
    <div class="p-3.5">
      <h3 class="ethnocentric m-0 text-[15px]">{{ item.name }}</h3>
      <div class="flex justify-between items-center mt-2.5">
        <p class="m-0 text-muted text-xs">Floor {{ item.floorPrice }}</p>
        <span class="text-xs font-bold" :class="item.change >= 0 ? 'text-success' : 'text-danger'">
          {{ item.change >= 0 ? '+' : '' }}{{ item.change }}%
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { CollectionCard as CollectionCardType } from '~/types/marketplace'

defineProps<{
  item: CollectionCardType
}>()
</script>

<style scoped>
.collection-card {
  transition: border-color 0.2s, transform 0.2s;
}
.collection-card:hover {
  border-color: var(--color-line-strong);
  transform: translateY(-2px);
}
</style>