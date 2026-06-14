<template>
  <div class="grid grid-cols-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-3">
    <article
      v-for="token in items"
      :key="token.id"
      class="token-card surface flex justify-between gap-3 p-3.5 cursor-pointer"
    >
      <div class="flex items-center gap-2.5">
        <img class="w-[38px] h-[38px] rounded-full object-cover" :src="token.image" :alt="token.name" />
        <div>
          <h3 class="ethnocentric m-0 text-sm">{{ token.name }}</h3>
          <p class="mt-1 mb-0 text-xs text-muted">{{ token.priceLabel }}</p>
        </div>
      </div>

      <div class="flex flex-col items-end justify-center gap-1">
        <span class="text-xs font-bold" :class="token.change >= 0 ? 'text-success' : 'text-danger'">
          {{ token.change >= 0 ? '+' : '' }}{{ token.change }}%
        </span>
        <svg class="w-[42px] h-[18px]" viewBox="0 0 42 18" fill="none">
          <polyline
            :points="token.change >= 0 ? '0,16 8,12 16,14 24,6 32,8 42,2' : '0,2 8,6 16,4 24,12 32,10 42,16'"
            :stroke="token.change >= 0 ? '#1dd47e' : '#ff5b6a'"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </svg>
      </div>
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
.token-card {
  transition: border-color 0.2s, transform 0.2s;
}
.token-card:hover {
  border-color: var(--color-line-strong);
  transform: translateY(-2px);
}
</style>