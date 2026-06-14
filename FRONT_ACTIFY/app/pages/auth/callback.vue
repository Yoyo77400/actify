<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-4">
    <div class="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    <p class="text-muted text-sm">Connexion en cours...</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { mockLogin } = useAuth()
const route = useRoute()

onMounted(async () => {
  const provider = (route.query.provider as 'google' | 'github') ?? 'google'
  await mockLogin(provider)
})
</script>
