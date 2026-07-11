<template>
  <div class="w-full flex flex-col gap-3">
    <div v-for="wallet in walletDescriptors" :key="wallet.id" class="relative">
      <button
        class="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-white/10 bg-panel-3 text-foreground transition-all duration-200 hover:border-accent/60 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="pending !== null || availability[wallet.id] !== true"
        @click="$emit('select', wallet.id)"
      >
        <Icon :name="wallet.icon" class="text-xl shrink-0" />
        <span class="font-medium text-sm">
          {{ pending === wallet.id ? 'Signature en cours...' : wallet.label }}
        </span>
        <span
          v-if="pending === wallet.id"
          class="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin"
        />
      </button>
      <a
        v-if="availability[wallet.id] === false && wallet.installUrl"
        :href="wallet.installUrl"
        target="_blank"
        rel="noopener"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-accent text-xs hover:underline"
      >
        Installer
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getWalletAdapter, walletDescriptors, type WalletId } from '~/lib/wallets'

defineProps<{ pending: WalletId | null }>()

defineEmits<{ select: [id: WalletId] }>()

// undefined = check in progress → button stays disabled, no "Installer" link yet.
const availability = ref<Partial<Record<WalletId, boolean>>>({})

function checkAvailability(id: WalletId, attempt = 0) {
  getWalletAdapter(id)
    .then(adapter => adapter.isAvailable())
    .then((available) => {
      availability.value[id] = available
      // Extensions inject their API asynchronously — one delayed re-check
      // avoids showing "Installer" to users who do have the wallet.
      if (!available && attempt === 0) {
        setTimeout(() => checkAvailability(id, 1), 1500)
      }
    })
    .catch(() => {
      availability.value[id] = false
    })
}

onMounted(() => {
  for (const { id } of walletDescriptors) {
    checkAvailability(id)
  }
})
</script>
