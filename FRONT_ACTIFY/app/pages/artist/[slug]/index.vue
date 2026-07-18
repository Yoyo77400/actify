<script setup lang="ts">
// The artist area is a single "items" view (collections have no API and were
// removed) — the bare /artist/:slug URL forwards there.
const route = useRoute()
await navigateTo(`/artist/${route.params.slug}/items`, { replace: true })
</script>

<template>
  <div class="visually-hidden">Redirection…</div>
</template>
