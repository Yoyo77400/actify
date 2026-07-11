<template>
  <section class="surface overflow-hidden grid grid-cols-[1.2fr_1fr] max-lg:grid-cols-1">
    <div
      class="min-h-[270px] bg-cover bg-center relative"
      :style="{ backgroundImage: `linear-gradient(90deg, rgba(8,11,17,.86), rgba(8,11,17,.36)), url(${payload.background})` }"
    >
      <div class="absolute left-6 bottom-6 max-sm:left-4 max-sm:bottom-4">
        <h3 class="ethnocentric m-0 text-[clamp(20px,3vw,28px)]">{{ payload.title }}</h3>
        <p class="mt-2.5 mb-0 text-[#d4dbe7] text-sm">{{ payload.subtitle }}</p>
      </div>
    </div>

    <div class="grid grid-cols-3 max-sm:grid-cols-1 gap-3 p-4">
      <article
        v-for="item in payload.items"
        :key="item.id"
        class="weekly-item bg-panel-3 rounded-xl overflow-hidden cursor-pointer"
      >
        <div class="overflow-hidden">
          <img
            class="w-full h-[160px] max-sm:h-[140px] object-cover transition-transform duration-300 hover:scale-105"
            :src="item.image"
            :alt="item.name"
          >
        </div>
        <div class="p-2.5">
          <h4 class="ethnocentric m-0 text-[13px]">{{ item.name }}</h4>
          <p class="mt-1.5 mb-0 text-muted text-xs">{{ item.price }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { WeeklyShowcase } from '~/types/marketplace'

defineProps<{
  payload: WeeklyShowcase
}>()
</script>