<template>
  <nav class="flex gap-1 border-b border-line" aria-label="Sections artistes">
    <NuxtLink
      to="/artists"
      class="px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors"
      :class="route.path === '/artists' ? 'border-accent text-foreground font-medium' : 'border-transparent text-muted hover:text-foreground'"
    >
      Découvrir
    </NuxtLink>
    <NuxtLink
      to="/artists/following"
      class="px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors"
      :class="route.path === '/artists/following' ? 'border-accent text-foreground font-medium' : 'border-transparent text-muted hover:text-foreground'"
    >
      Mes abonnements
    </NuxtLink>
    <NuxtLink
      to="/artists/feed"
      class="px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors"
      :class="route.path === '/artists/feed' ? 'border-accent text-foreground font-medium' : 'border-transparent text-muted hover:text-foreground'"
    >
      Feed
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
</script>
