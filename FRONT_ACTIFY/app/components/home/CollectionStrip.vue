<template>
  <div class="grid grid-cols-3 max-xl:grid-cols-2 max-sm:grid-cols-1 gap-3">
    <article
      v-for="item in items"
      :key="item.id"
      class="strip-card surface flex justify-between items-center gap-3 p-3.5 cursor-pointer"
    >
      <div class="flex items-center gap-2.5">
        <img class="w-9 h-9 rounded-[10px] object-cover" :src="item.image" :alt="item.name" >
        <div>
          <h3 class="ethnocentric m-0 text-sm">
            {{ item.name }}
            <span v-if="item.verified" class="text-verified text-[0.8em]">✔</span>
          </h3>
          <p class="mt-1 mb-0 text-muted text-xs">{{ item.symbol }}</p>
        </div>
      </div>

      <span class="text-xs font-bold" :class="item.change >= 0 ? 'text-success' : 'text-danger'">
        {{ item.change >= 0 ? '+' : '' }}{{ item.change }}%
      </span>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { MarketToken } from '~/types/marketplace'

defineProps<{
  items: MarketToken[]
}>()
</script>

<style scoped>
.strip-card {
  transition: border-color 0.2s, transform 0.2s;
}
.strip-card:hover {
  border-color: var(--color-line-strong);
  transform: translateY(-2px);
}
</style>