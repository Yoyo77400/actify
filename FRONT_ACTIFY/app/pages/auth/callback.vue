<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-4">
    <div class="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    <p class="text-muted text-sm">Redirection...</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

// TODO(auth2): consume the OAuth2 authorization code here once the backend
// implements GET /auth/oauth/:provider. Until then, back to the login page.
onMounted(() => {
  navigateTo('/auth/login', { replace: true })
})
</script>
