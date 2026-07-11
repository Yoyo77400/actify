<script setup lang="ts">
  const item = {
    label: 'Connect',
    to: '/auth/login',
    icon: 'user',
  }
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
      <NuxtLink
        :key="item.label"
        :to="item.to"
        :class="'ghost-btn'"
        :title="item.label"
      >
      Connect Wallet
      </NuxtLink>
      <button
        class="w-10 h-10 rounded-full border border-line bg-panel text-foreground"
        type="button"
        aria-label="Aide"
      >◎</button>
    </div>
  </header>
</template>
