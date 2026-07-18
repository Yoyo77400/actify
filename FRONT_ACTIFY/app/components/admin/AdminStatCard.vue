<template>
  <div class="surface p-4">
    <p class="m-0 text-muted text-xs uppercase tracking-wider">{{ label }}</p>
    <p class="m-0 mt-2 text-2xl font-bold">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
// GET /admin/stats exposes no growth data — plain label + value only.
defineProps<{
  label: string
  value: string | number
}>()
</script>
