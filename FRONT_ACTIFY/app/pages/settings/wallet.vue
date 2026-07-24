<template>
  <div class="flex flex-col gap-6 max-w-2xl">

    <SettingsTabs />

    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-b from-[#1a56db] to-[#0f3a9e] flex items-center justify-center shrink-0">
        <Icon name="ph:wallet" class="text-xl text-white" />
      </div>
      <div>
        <h1 class="ethnocentric text-foreground text-xl">Wallet</h1>
        <p class="text-muted text-sm">Link your XRP wallet to buy and hold digital licenses.</p>
      </div>
    </div>

    <div v-if="wallets.length" class="surface overflow-hidden">
      <div
        v-for="(wallet, i) in wallets"
        :key="wallet.id"
        class="flex items-center gap-4 px-5 py-4"
        :class="i < wallets.length - 1 ? 'border-b border-white/5' : ''"
      >
        <div class="w-10 h-10 rounded-full bg-panel-3 border border-line flex items-center justify-center shrink-0">
          <Icon name="ph:wallet" class="text-lg text-accent" />
        </div>
        <div class="min-w-0">
          <p class="text-foreground text-sm font-mono truncate">{{ wallet.address }}</p>
          <p class="text-muted text-xs mt-0.5">
            XRP Ledger · lié le {{ new Date(wallet.createdAt).toLocaleDateString('fr-FR') }}
          </p>
        </div>
        <span
          v-if="wallet.isPrimary"
          class="ml-auto shrink-0 text-xs text-accent border border-accent/40 rounded-full px-2.5 py-1"
        >Principal</span>
      </div>
    </div>

    <div class="surface p-8 flex flex-col items-center gap-4 text-center">
      <div v-if="!wallets.length">
        <p class="text-foreground font-medium">No wallet connected</p>
        <p class="text-muted text-sm mt-1">Connect your XRP wallet to start buying and selling licenses.</p>
      </div>

      <template v-if="showPicker">
        <AuthWalletPicker :pending="pending" :step="step" @select="onSelect" />
        <p v-if="error" class="text-red-400 text-xs" role="alert">{{ error }}</p>
        <button class="text-muted text-xs hover:text-foreground hover:underline" @click="showPicker = false">
          Annuler
        </button>
      </template>
      <button v-else class="primary-btn mt-2" @click="showPicker = true">
        {{ wallets.length ? 'Lier un autre wallet' : 'Link XRP Wallet' }}
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
import type { WalletId } from '~/lib/wallets'

definePageMeta({ middleware: 'auth' })

useHead({ title: 'Wallet' })

const { user } = useAuth()
const { pending, step, error, linkWallet } = useWalletAuth()

const wallets = computed(() => user.value?.wallets ?? [])
const showPicker = ref(false)

async function onSelect(id: WalletId) {
  await linkWallet(id)
  if (!error.value) {
    showPicker.value = false
  }
}
</script>
