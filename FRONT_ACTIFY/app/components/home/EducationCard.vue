<template>
  <article class="surface overflow-hidden group cursor-pointer edu-card">
    <div class="h-[170px] overflow-hidden">
      <img
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        :src="item.image"
        :alt="item.title"
      >
    </div>
    <div class="p-3.5">
      <h3 class="ethnocentric m-0 text-[15px]">{{ item.title }}</h3>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { EducationCard as EducationCardType } from '~/types/marketplace'

defineProps<{
  item: EducationCardType
}>()
</script>

<style scoped>
.edu-card {
  transition: border-color 0.2s, transform 0.2s;
}
.edu-card:hover {
  border-color: var(--color-line-strong);
  transform: translateY(-2px);
}
</style>