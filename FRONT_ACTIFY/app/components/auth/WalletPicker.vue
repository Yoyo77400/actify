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
          {{ pending === wallet.id ? (step ?? 'Connexion…') : wallet.label }}
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

defineProps<{ pending: WalletId | null; step?: string | null }>()

defineEmits<{ select: [id: WalletId] }>()

// undefined = check in progress → button stays disabled, no "Installer" link yet.
const availability = ref<Partial<Record<WalletId, boolean>>>({})

// Les extensions injectent leur API de façon asynchrone, et le délai varie
// beaucoup (démarrage à froid du navigateur, machine chargée). Une seule
// re-vérification à 1,5 s laissait le bouton grisé DÉFINITIVEMENT chez qui a
// pourtant le wallet installé. On réessaie donc sur ~11 s, en espaçant.
const RETRY_DELAYS_MS = [300, 700, 1500, 3000, 5000]

const timers = new Set<ReturnType<typeof setTimeout>>()

function checkAvailability(id: WalletId, attempt = 0) {
  getWalletAdapter(id)
    .then(adapter => adapter.isAvailable())
    .then((available) => {
      availability.value[id] = available
      const delay = RETRY_DELAYS_MS[attempt]
      if (!available && delay !== undefined) {
        const timer = setTimeout(() => {
          timers.delete(timer)
          checkAvailability(id, attempt + 1)
        }, delay)
        timers.add(timer)
      }
    })
    .catch(() => {
      availability.value[id] = false
    })
}

function checkAll() {
  for (const { id } of walletDescriptors) {
    // Ne pas relancer une détection pour un wallet déjà trouvé.
    if (availability.value[id] !== true) checkAvailability(id)
  }
}

onMounted(() => {
  checkAll()
  // L'utilisateur part installer ou déverrouiller son wallet puis revient :
  // sans ça, il devrait recharger la page pour que le bouton s'active.
  window.addEventListener('focus', checkAll)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', checkAll)
  for (const timer of timers) clearTimeout(timer)
  timers.clear()
})
</script>
