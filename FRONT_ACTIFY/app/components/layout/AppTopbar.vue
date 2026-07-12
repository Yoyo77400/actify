<script setup lang="ts">
const { user, isLoggedIn, logout } = useAuth()

const displayName = computed(() => user.value?.displayName || user.value?.username || 'Mon compte')
</script>

<template>
  <header class="flex items-center justify-between gap-[18px] mb-[18px] max-md:flex-col max-md:items-stretch">
    <div class="surface--soft min-w-[280px] w-[min(100%,360px)] h-11 px-3 flex items-center gap-2.5 max-md:w-full">
      <span class="text-muted">⌕</span>
      <input
        class="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted"
        type="text"
        placeholder="Search Actify"
      >
      <span class="text-muted">/</span>
    </div>

    <div class="flex items-center gap-2.5 max-md:justify-end">
      <template v-if="isLoggedIn">
        <NuxtLink to="/profile" class="ghost-btn flex items-center gap-2" title="Mon profil">
          <Icon name="ph:user-circle" class="text-lg" />
          <span class="max-md:hidden">{{ displayName }}</span>
        </NuxtLink>
        <button
          class="w-10 h-10 rounded-full border border-line bg-panel text-foreground hover:text-red-400"
          type="button"
          aria-label="Se déconnecter"
          title="Se déconnecter"
          @click="logout"
        >
          <Icon name="ph:sign-out" class="text-lg" />
        </button>
      </template>
      <NuxtLink v-else to="/auth/login" class="ghost-btn" title="Se connecter">
        Connect Wallet
      </NuxtLink>
    </div>
  </header>
</template>
