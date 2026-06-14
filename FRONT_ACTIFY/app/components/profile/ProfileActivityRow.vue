<template>
  <div
    class="flex items-center justify-between gap-3 px-4 py-3"
    :class="{ 'border-b border-line': !last }"
  >
    <div class="flex items-center gap-3">
      <span class="w-8 h-8 rounded-lg flex items-center justify-center text-sm" :class="iconBg">
        <Icon :name="iconName" />
      </span>
      <div>
        <p class="m-0 text-sm font-medium">
          <span class="text-muted">{{ activity.label }}</span>
          {{ activity.item }}
        </p>
        <p class="m-0 text-xs text-muted-2 mt-0.5">{{ activity.date }}</p>
      </div>
    </div>

    <span v-if="activity.price !== '—'" class="text-sm font-semibold whitespace-nowrap">
      {{ activity.price }} {{ activity.currency }}
    </span>
    <span v-else class="text-sm text-muted">—</span>
  </div>
</template>

<script setup lang="ts">
import type { ProfileActivity } from '~/types/profile'

const props = defineProps<{
  activity: ProfileActivity
  last: boolean
}>()

const iconMap: Record<string, { icon: string; bg: string }> = {
  sale: { icon: 'ph:tag', bg: 'bg-success/12 text-success' },
  purchase: { icon: 'ph:shopping-cart', bg: 'bg-accent/12 text-accent' },
  mint: { icon: 'ph:sparkle', bg: 'bg-warning/12 text-warning' },
  transfer: { icon: 'ph:arrow-right', bg: 'bg-muted/12 text-muted' }
}

const entry = computed(() => iconMap[props.activity.type] ?? iconMap.transfer)
const iconName = computed(() => entry.value.icon)
const iconBg = computed(() => entry.value.bg)
</script>