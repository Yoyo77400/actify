<template>
  <div class="flex flex-col gap-6 max-w-2xl">

    <SettingsTabs />

    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-b from-[#1dd47e] to-[#0e8f52] flex items-center justify-center shrink-0">
        <Icon name="ph:shield-check" class="text-xl text-white" />
      </div>
      <div>
        <h1 class="ethnocentric text-foreground text-xl">Privacy Settings</h1>
        <p class="text-muted text-sm">Gérez vos consentements et exercez vos droits RGPD.</p>
      </div>
    </div>

    <!-- Consentements -->
    <div class="surface p-5 flex flex-col gap-5">
      <h2 class="text-foreground font-medium text-sm">Consentement</h2>

      <p v-if="loadError" class="text-danger text-xs" role="alert">{{ loadError }}</p>

      <div
        v-for="(def, i) in CONSENT_CATEGORIES"
        :key="def.category"
        class="flex items-center justify-between gap-4 flex-wrap"
        :class="i > 0 ? 'border-t border-white/10 pt-5' : ''"
      >
        <div class="flex items-center gap-3 min-w-0">
          <Icon :name="def.icon" class="text-2xl text-muted shrink-0" />
          <div class="min-w-0">
            <p class="text-foreground font-medium text-sm">{{ def.label }}</p>
            <p class="text-muted text-xs mt-0.5">{{ def.description }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span v-if="loadingConsents" class="text-muted text-xs">…</span>
          <template v-else>
            <span
              class="pill-badge"
              :class="isGranted(def.category) ? 'text-emerald-400 border-emerald-400/20' : 'text-danger border-danger/20'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="isGranted(def.category) ? 'bg-emerald-400' : 'bg-danger'" />
              {{ isGranted(def.category) ? 'Autorisé' : 'Refusé' }}
            </span>
            <button
              class="ghost-btn text-xs px-3"
              :disabled="savingCategory === def.category"
              @click="setConsent(def.category, !isGranted(def.category))"
            >
              {{ isGranted(def.category) ? 'Refuser' : 'Autoriser' }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Export des données -->
    <div class="surface p-5 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <Icon name="ph:download-simple" class="text-2xl text-muted shrink-0" />
        <div>
          <p class="text-foreground font-medium text-sm">Exporter mes données</p>
          <p class="text-muted text-xs mt-0.5">
            Téléchargez une copie complète de vos données (profil, wallets, achats, ventes, avis, favoris) au format JSON.
          </p>
        </div>
      </div>
      <p v-if="exportError" class="text-danger text-xs" role="alert">{{ exportError }}</p>
      <p v-if="exportSuccess" class="text-emerald-400 text-xs">Export téléchargé ✅</p>
      <button class="secondary-btn w-fit text-sm" :disabled="exporting" @click="handleExport">
        {{ exporting ? 'Préparation…' : 'Télécharger mes données (JSON)' }}
      </button>
    </div>

    <!-- Zone de danger -->
    <div class="surface p-5 flex flex-col gap-4" style="border-color: color-mix(in srgb, var(--color-danger) 25%, transparent)">
      <div class="flex items-center gap-3">
        <Icon name="ph:warning-circle" class="text-2xl text-danger shrink-0" />
        <div>
          <p class="text-foreground font-medium text-sm">Supprimer mon compte</p>
          <p class="text-muted text-xs mt-0.5">
            Action irréversible : votre profil est anonymisé et vos wallets sont déliés — vous perdez immédiatement
            l'accès à votre compte. Vos achats et ventes confirmés sont conservés à des fins comptables.
          </p>
        </div>
      </div>

      <p v-if="deleteError" class="text-danger text-xs" role="alert">{{ deleteError }}</p>

      <button
        v-if="!confirmingDelete"
        type="button"
        class="ghost-btn w-fit text-sm text-danger border-danger/30 hover:bg-danger/10"
        @click="confirmingDelete = true"
      >
        Supprimer mon compte
      </button>

      <div v-else class="flex flex-col gap-3 border-t border-white/10 pt-4">
        <p class="text-muted text-xs">
          Tapez <code class="text-foreground">SUPPRIMER</code> pour confirmer :
        </p>
        <input
          v-model="deleteConfirmText"
          class="input"
          placeholder="SUPPRIMER"
          autocomplete="off"
          @keyup.enter="handleDelete"
        >
        <div class="flex gap-2">
          <button
            type="button"
            class="danger-btn text-sm"
            :disabled="deleteConfirmText !== 'SUPPRIMER' || deleting"
            @click="handleDelete"
          >
            {{ deleting ? 'Suppression…' : 'Confirmer la suppression' }}
          </button>
          <button type="button" class="ghost-btn text-sm px-4" :disabled="deleting" @click="cancelDelete">
            Annuler
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { ConsentRecord } from '~/types/consent'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Privacy Settings' })

// policyVersion : identifiant de la version de politique de confidentialité
// acceptée/refusée, pour pouvoir redemander le consentement si elle évolue.
const POLICY_VERSION = '1.0'

const CONSENT_CATEGORIES = [
  {
    category: 'analytics',
    icon: 'ph:chart-line',
    label: 'Mesure d’audience',
    description: 'Associer votre navigation à votre compte pour nos statistiques internes (Umami, sans cookie tiers).',
  },
  {
    category: 'marketing',
    icon: 'ph:envelope-simple',
    label: 'Communications marketing',
    description: 'Recevoir occasionnellement des nouveautés et offres par email.',
  },
] as const

const { exportData, deleteAccount } = useAuth()
const { list, upsert } = useConsents()

// Category -> record. Missing entry = jamais tranché = non accordé par défaut.
const consents = ref(new Map<string, ConsentRecord>())
const loadingConsents = ref(true)
const loadError = ref<string | null>(null)
const savingCategory = ref<string | null>(null)

function isGranted(category: string): boolean {
  return consents.value.get(category)?.isGranted ?? false
}

async function loadConsents() {
  loadingConsents.value = true
  loadError.value = null
  try {
    const records = await list()
    consents.value = new Map(records.map(r => [r.category, r]))
  } catch (e) {
    loadError.value = toApiError(e)?.message ?? 'Impossible de charger vos consentements.'
  } finally {
    loadingConsents.value = false
  }
}

async function setConsent(category: string, value: boolean) {
  savingCategory.value = category
  loadError.value = null
  try {
    const updated = await upsert(category, value, POLICY_VERSION)
    consents.value.set(category, updated)
  } catch (e) {
    loadError.value = toApiError(e)?.message ?? 'Impossible de mettre à jour ce consentement.'
  } finally {
    savingCategory.value = null
  }
}

onMounted(() => { loadConsents() })

const exporting = ref(false)
const exportError = ref<string | null>(null)
const exportSuccess = ref(false)

async function handleExport() {
  exporting.value = true
  exportError.value = null
  exportSuccess.value = false
  try {
    const data = await exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `actify-export-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    exportSuccess.value = true
  } catch (e) {
    exportError.value = toApiError(e)?.message ?? "L'export a échoué, réessayez."
  } finally {
    exporting.value = false
  }
}

const confirmingDelete = ref(false)
const deleteConfirmText = ref('')
const deleting = ref(false)
const deleteError = ref<string | null>(null)

function cancelDelete() {
  confirmingDelete.value = false
  deleteConfirmText.value = ''
  deleteError.value = null
}

async function handleDelete() {
  if (deleteConfirmText.value !== 'SUPPRIMER') return
  deleting.value = true
  deleteError.value = null
  try {
    await deleteAccount()
    await navigateTo('/')
  } catch (e) {
    const apiError = toApiError(e)
    deleteError.value = apiError?.code === 'TWO_FACTOR_REQUIRED'
      ? 'Reconnectez-vous pour confirmer votre identité, puis réessayez.'
      : apiError?.message ?? 'La suppression a échoué, réessayez.'
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
/* Variante "danger" du bouton primaire : même gabarit que .primary-btn sans
   son dégradé bleu (les utilities Tailwind seules ne l'emportent pas dessus). */
.danger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 10px;
  color: white;
  background: var(--color-danger);
  border: 1px solid color-mix(in srgb, var(--color-danger) 60%, transparent);
  transition: 0.18s ease;
}
.danger-btn:hover:not(:disabled) { filter: brightness(1.08); }
.danger-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
