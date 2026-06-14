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
      <div class="w-12 h-12 rounded-xl bg-gradient-to-b from-[#1a56db] to-[#0f3a9e] flex items-center justify-center shrink-0">
        <Icon name="ph:wallet" class="text-xl text-white" />
      </div>
      <div>
        <h1 class="ethnocentric text-foreground text-xl">Wallet</h1>
        <p class="text-muted text-sm">Link your XRP wallet to buy and hold digital licenses.</p>
      </div>
    </div>

    <div class="surface p-8 flex flex-col items-center gap-4 text-center">
      <div class="w-14 h-14 rounded-full bg-panel-3 border border-line flex items-center justify-center">
        <Icon name="ph:wallet" class="text-2xl text-muted" />
      </div>
      <div>
        <p class="text-foreground font-medium">No wallet connected</p>
        <p class="text-muted text-sm mt-1">Connect your XRP wallet to start buying and selling licenses.</p>
      </div>
      <button class="primary-btn mt-2" @click="connecting = true">
        <span v-if="!connecting">Link XRP Wallet</span>
        <span v-else class="flex items-center gap-2">
          <span class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          Connecting...
        </span>
      </button>
    </div>

    <div class="surface p-5 flex items-center gap-3">
      <Icon name="ph:info" class="text-accent shrink-0" />
      <p class="text-muted text-sm">
        Actify uses the <span class="text-foreground">XRP Ledger</span> to issue tamper-proof license NFTs.
        Your wallet is never given spending permissions.
      </p>
    </div>

  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const connecting = ref(false)

useHead({ title: 'Wallet' })
</script>
