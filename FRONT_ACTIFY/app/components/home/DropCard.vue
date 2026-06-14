<template>
  <article class="surface relative overflow-hidden min-h-[170px] group cursor-pointer drop-card">
    <div class="h-[170px] overflow-hidden">
      <img
        class="w-full h-full object-cover brightness-[0.72] transition-transform duration-300 group-hover:scale-105"
        :src="item.image"
        :alt="item.name"
      />
    </div>
    <div
      class="absolute inset-x-0 bottom-0 p-3.5"
      style="background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.78) 100%)"
    >
      <h3 class="ethnocentric m-0 text-[15px]">{{ item.name }}</h3>
      <p class="mt-1.5 mb-0 text-[#d8deea] text-xs">{{ item.subtitle }}</p>
      <span
        v-if="item.badge"
        class="pill-badge mt-2.5 text-[#08120d] bg-success border-success"
      >
        {{ item.badge }}
      </span>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { DropCard as DropCardType } from '~/types/marketplace'

defineProps<{
  item: DropCardType
}>()
</script>

<style scoped>
.drop-card {
  transition: border-color 0.2s, transform 0.2s;
}
.drop-card:hover {
  border-color: var(--color-line-strong);
  transform: translateY(-2px);
}
</style>