<template>
  <div class="surface p-4">
    <div class="flex items-center gap-2.5 mb-3">
      <Icon name="ph:chart-line-up" class="text-lg text-muted" />
      <h3 class="m-0 text-sm font-semibold">Stats</h3>
    </div>

    <div class="flex flex-col gap-3">
      <div v-for="stat in stats" :key="stat.label" class="flex justify-between items-baseline">
        <span class="text-muted text-[13px]">{{ stat.label }}</span>
        <div class="flex items-baseline gap-1.5">
          <span class="text-sm font-semibold">{{ stat.value }}</span>
          <span
            v-if="stat.change != null"
            class="text-xs font-bold"
            :class="stat.change >= 0 ? 'text-success' : 'text-danger'"
          >
            {{ stat.change >= 0 ? '+' : '' }}{{ stat.change }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProfileStat } from '~/types/profile'

defineProps<{ stats: ProfileStat[] }>()
</script>