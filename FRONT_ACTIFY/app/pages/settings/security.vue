<template>
  <div class="flex flex-col gap-6 max-w-2xl">

    <SettingsTabs />

    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-b from-[#7c5cbf] to-[#4a2d8a] flex items-center justify-center shrink-0">
        <Icon name="ph:shield-check" class="text-xl text-white" />
      </div>
      <div>
        <h1 class="ethnocentric text-foreground text-xl">Security Settings</h1>
        <p class="text-muted text-sm">Manage your account authentication and connected ledger devices.</p>
      </div>
    </div>

    <div class="surface p-5 flex flex-col gap-5">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <Icon name="ph:device-mobile" class="text-2xl text-muted shrink-0" />
          <div>
            <p class="text-foreground font-medium text-sm">Two-Factor Authentication (TOTP)</p>
            <p class="text-muted text-xs mt-0.5">Un code à 6 chiffres depuis Google/Microsoft Authenticator, en plus de votre wallet.</p>
          </div>
        </div>
        <span
          v-if="enabled"
          class="pill-badge text-emerald-400 border-emerald-400/20"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Active
        </span>
        <span v-else class="pill-badge text-danger border-danger/20">
          <span class="w-1.5 h-1.5 rounded-full bg-danger" />
          Inactive
        </span>
      </div>

      <!-- Enrôlement : QR + confirmation -->
      <div v-if="setupData" class="flex flex-col gap-4 border-t border-white/10 pt-5">
        <p class="text-muted text-xs">1. Scannez ce QR code avec votre application d'authentification :</p>
        <img :src="setupData.qrCode" alt="QR code 2FA" class="w-44 h-44 rounded-lg bg-white p-2 self-center">
        <p class="text-muted text-xs">
          Ou saisissez la clé manuellement :
          <code class="text-foreground break-all">{{ setupData.secret }}</code>
        </p>
        <p class="text-muted text-xs">2. Entrez le code à 6 chiffres pour confirmer :</p>
        <input
          v-model="code"
          class="input text-center tracking-[0.4em] text-lg"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          placeholder="000000"
        >
        <p v-if="error" class="text-red-400 text-xs" role="alert">{{ error }}</p>
        <div class="flex gap-2">
          <button class="primary-btn" :disabled="busy || code.length < 6" @click="confirmEnroll">
            {{ busy ? 'Vérification…' : 'Activer la 2FA' }}
          </button>
          <button class="ghost-btn text-sm px-4" :disabled="busy" @click="cancelEnroll">Annuler</button>
        </div>
      </div>

      <div v-else class="border-t border-white/10 pt-5">
        <p v-if="success" class="text-emerald-400 text-xs mb-3">La 2FA est désormais activée sur votre compte. ✅</p>
        <p v-if="error" class="text-red-400 text-xs mb-3" role="alert">{{ error }}</p>
        <p v-if="enabled" class="text-muted text-xs">
          La double authentification est active. Elle est exigée à la connexion et pour les actions sensibles (suppression, mise en ligne, confirmation de paiement).
        </p>
        <button v-else class="primary-btn w-fit" :disabled="busy" @click="startEnroll">
          {{ busy ? 'Préparation…' : 'Activer la 2FA' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { TwoFactorSetup } from '~/types/auth'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Security Settings' })

const { user, fetchMe } = useAuth()
const { setup, confirm } = useTwoFactor()

const enabled = computed(() => user.value?.twoFactorEnabled ?? false)
const setupData = ref<TwoFactorSetup | null>(null)
const code = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

onMounted(() => { fetchMe().catch(() => {}) })

async function startEnroll() {
  busy.value = true
  error.value = null
  success.value = false
  try {
    setupData.value = await setup()
  } catch (e) {
    error.value = toApiError(e)?.message ?? "Impossible de démarrer l'activation."
  } finally {
    busy.value = false
  }
}

async function confirmEnroll() {
  busy.value = true
  error.value = null
  try {
    await confirm(code.value.trim())
    await fetchMe()
    setupData.value = null
    code.value = ''
    success.value = true
  } catch (e) {
    error.value = toApiError(e)?.message ?? 'Code invalide, réessaie.'
  } finally {
    busy.value = false
  }
}

function cancelEnroll() {
  setupData.value = null
  code.value = ''
  error.value = null
}
</script>
