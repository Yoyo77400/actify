<template>
  <div class="flex gap-1 border-b border-white/10 pb-0">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors"
      :class="route.path === tab.to ? 'text-foreground border-b-2 border-accent -mb-px' : 'text-muted hover:text-foreground'"
    >{{ tab.label }}</NuxtLink>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const tabs = [
  { to: '/settings/security', label: 'Security' },
  { to: '/settings/wallet', label: 'Wallet' },
  { to: '/settings/privacy', label: 'Privacy' },
]
</script>
