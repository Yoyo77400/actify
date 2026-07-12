<template>
  <div class="flex flex-col gap-6 max-w-2xl">

    <div class="flex gap-1 border-b border-white/10 pb-0">
      <NuxtLink
        to="/settings/security"
        class="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors"
        :class="route.path === '/settings/security' ? 'text-foreground border-b-2 border-accent -mb-px' : 'text-muted hover:text-foreground'"
      >Security</NuxtLink>
      <NuxtLink
        to="/settings/wallet"
        class="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors"
        :class="route.path === '/settings/wallet' ? 'text-foreground border-b-2 border-accent -mb-px' : 'text-muted hover:text-foreground'"
      >Wallet</NuxtLink>
    </div>

    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-b from-[#7c5cbf] to-[#4a2d8a] flex items-center justify-center shrink-0">
        <Icon name="ph:shield-check" class="text-xl text-white" />
      </div>
      <div>
        <h1 class="ethnocentric text-foreground text-xl">Security Settings</h1>
        <p class="text-muted text-sm">Manage your account authentication and connected ledger devices.</p>
      </div>
    </div>

    <div class="surface p-5 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <Icon name="ph:device-mobile" class="text-2xl text-muted shrink-0" />
        <div>
          <p class="text-foreground font-medium text-sm">Two-Factor Authentication</p>
          <p class="text-muted text-xs mt-0.5">Add an extra layer of security to your account.</p>
        </div>
      </div>
      <span class="pill-badge text-danger border-danger/20">
        <span class="w-1.5 h-1.5 rounded-full bg-danger" />
        Inactive
      </span>
    </div>

    <div class="surface p-5 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <Icon name="ph:key" class="text-2xl text-muted shrink-0" />
        <div>
          <p class="text-foreground font-medium text-sm">Recovery Codes</p>
          <p class="text-muted text-xs mt-0.5">Backup codes to access your account if you lose your device.</p>
        </div>
      </div>
      <button class="ghost-btn text-sm px-3" disabled>Generate</button>
    </div>

    <button class="primary-btn w-fit">
      Enable 2FA
    </button>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const route = useRoute()
useHead({ title: 'Security Settings' })
</script>
