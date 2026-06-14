<script setup lang="ts">
const route = useRoute()
await navigateTo(`/artist/${route.params.slug}/collections`, { replace: true })
</script>

<template>
  <div class="visually-hidden">Redirection…</div>
</template>
