<template>
  <div class="flex items-center justify-between gap-3.5 max-lg:flex-col max-lg:items-stretch">
    <div class="flex gap-2 scroll-x">
      <button
        v-for="category in categories"
        :key="category.id"
        class="chip shrink-0"
        :class="{ 'chip--active': category.id === ui.selectedCategory }"
        type="button"
        @click="ui.setCategory(category.id)"
      >
        {{ category.label }}
      </button>
    </div>

    <div class="flex gap-2 scroll-x justify-end max-lg:justify-start">
      <button
        v-for="chain in chains"
        :key="chain.id"
        class="chip shrink-0"
        :class="{ 'chip--active': chain.id === ui.selectedChain }"
        type="button"
        @click="ui.setChain(chain.id)"
      >
        {{ chain.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CategoryChip } from '~/types/marketplace'

const ui = useMarketplaceUiStore()

defineProps<{
  categories: CategoryChip[]
  chains: CategoryChip[]
}>()
</script>