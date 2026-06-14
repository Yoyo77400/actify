<template>
  <div class="surface p-4">
    <p class="m-0 text-muted text-xs uppercase tracking-wider">{{ label }}</p>
    <p class="m-0 mt-2 text-2xl font-bold">{{ value }}</p>
    <span
      v-if="change != null"
      class="text-xs font-bold mt-1 inline-block"
      :class="change >= 0 ? 'text-success' : 'text-danger'"
    >
      {{ change >= 0 ? '+' : '' }}{{ change }}%
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  change?: number
}>()
</script>