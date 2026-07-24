<template>
  <div class="max-w-3xl mx-auto flex flex-col gap-7 py-2">
    <header class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-b from-[#2e6dff] to-[#1850db] flex items-center justify-center shrink-0">
        <Icon name="ph:rocket-launch" class="text-xl text-white" />
      </div>
      <div>
        <h1 class="ethnocentric text-foreground text-xl">Publier un asset</h1>
        <p class="text-muted text-sm">Créez le brouillon, mintez le NFT, puis mettez-le en vente.</p>
      </div>
    </header>

    <!-- What "publish" actually does on-chain. -->
    <div class="surface--soft p-4 flex items-start gap-3">
        <Icon name="ph:info" class="text-accent text-lg shrink-0 mt-0.5" />
        <p class="text-muted text-sm">
          Publier mint votre asset comme NFT <span class="text-foreground">XLS-20</span> sur le
          <span class="text-foreground">XRP Ledger Testnet</span>. Gardez un peu de test-XRP dans votre
          wallet pour couvrir les frais de mint.
        </p>
      </div>

      <!-- ── Step 1: the form, as a 3-step wizard ── -->
      <form v-if="phase === 'form'" class="flex flex-col gap-8" @submit.prevent="onSubmit">
        <!-- Stepper -->
        <nav class="flex items-center justify-center py-2" aria-label="Étapes de publication">
          <template v-for="(s, i) in WIZARD_STEPS" :key="s.key">
            <button
              type="button"
              class="flex items-center gap-2.5"
              :class="i + 1 > furthestStep ? 'cursor-default' : 'cursor-pointer'"
              :disabled="i + 1 > furthestStep"
              :aria-current="i + 1 === currentStep ? 'step' : undefined"
              @click="goToStep(i + 1)"
            >
              <span
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border shrink-0 transition-colors"
                :class="stepDotClass(i + 1)"
              >
                <Icon v-if="i + 1 < currentStep" name="ph:check-bold" class="text-sm" />
                <span v-else>{{ i + 1 }}</span>
              </span>
              <span
                class="text-sm hidden sm:inline transition-colors"
                :class="i + 1 === currentStep ? 'text-foreground font-medium' : 'text-muted'"
              >{{ s.label }}</span>
            </button>
            <span
              v-if="i < WIZARD_STEPS.length - 1"
              class="w-10 sm:w-16 h-px mx-3 shrink-0 transition-colors"
              :class="i + 1 < currentStep ? 'bg-accent' : 'bg-line'"
            />
          </template>
        </nav>

        <Transition :name="direction === 'forward' ? 'slide-next' : 'slide-prev'" mode="out-in">
          <!-- Step 1: Contenu -->
          <section v-if="currentStep === 1" key="1" class="surface p-8 flex flex-col gap-6">
            <div class="flex flex-col gap-1.5">
              <label for="title" class="text-foreground text-sm font-medium">
                Titre <span class="text-danger">*</span>
              </label>
              <input
                id="title"
                ref="titleInputRef"
                v-model.trim="form.title"
                type="text"
                required
                minlength="3"
                maxlength="200"
                placeholder="ex : Pack de textures cyberpunk"
                class="input"
              >
              <p class="text-muted text-xs">3 à 200 caractères.</p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="shortDescription" class="text-foreground text-sm font-medium">Accroche</label>
              <input
                id="shortDescription"
                v-model.trim="form.shortDescription"
                type="text"
                maxlength="200"
                placeholder="Résumé court affiché sur la carte de l'asset"
                class="input"
              >
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="description" class="text-foreground text-sm font-medium">Description</label>
              <textarea
                id="description"
                v-model.trim="form.description"
                rows="4"
                placeholder="Décrivez le contenu, le format, la licence…"
                class="input py-3 resize-none"
                style="min-height: 96px"
              />
            </div>

            <div class="flex flex-col gap-2">
              <span class="text-foreground text-sm font-medium">Catégories</span>
              <div v-if="categoriesList.length" class="flex flex-wrap gap-2">
                <button
                  v-for="cat in categoriesList"
                  :key="cat.id"
                  type="button"
                  class="chip text-sm"
                  :class="form.categoryIds.includes(cat.id) ? 'chip--active' : ''"
                  @click="toggleCategory(cat.id)"
                >
                  {{ cat.name }}
                </button>
              </div>
              <p v-else class="text-muted text-xs">Aucune catégorie disponible.</p>
            </div>
          </section>

          <!-- Step 2: Distribution & prix -->
          <section v-else-if="currentStep === 2" key="2" class="surface p-8 flex flex-col gap-6">
            <div class="flex flex-col gap-2">
              <span class="text-foreground text-sm font-medium">Mode de distribution</span>
              <div class="grid grid-cols-3 max-sm:grid-cols-1 gap-2">
                <button
                  v-for="mode in DISTRIBUTION_MODES"
                  :key="mode.value"
                  type="button"
                  class="flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors"
                  :class="form.distributionMode === mode.value
                    ? 'border-accent bg-panel-3 text-foreground'
                    : 'border-line bg-transparent text-muted hover:border-line-strong'"
                  @click="form.distributionMode = mode.value"
                >
                  <span class="text-sm font-medium">{{ mode.label }}</span>
                  <span class="text-xs text-muted">{{ mode.hint }}</span>
                </button>
              </div>
            </div>

            <div v-if="form.distributionMode === 'limited'" class="flex flex-col gap-1.5">
              <label for="maxDownloads" class="text-foreground text-sm font-medium">
                Téléchargements maximum
              </label>
              <input
                id="maxDownloads"
                v-model.number="form.maxDownloads"
                type="number"
                min="1"
                step="1"
                placeholder="ex : 100"
                class="input"
              >
            </div>

            <label class="flex items-center gap-3 cursor-pointer select-none">
              <input v-model="form.isFree" type="checkbox" class="w-4 h-4 accent-[#2363ff]">
              <span class="text-foreground text-sm font-medium">Asset gratuit</span>
            </label>

            <div class="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
              <div v-if="!form.isFree" class="flex flex-col gap-1.5">
                <label for="basePrice" class="text-foreground text-sm font-medium">Prix</label>
                <input
                  id="basePrice"
                  v-model.number="form.basePrice"
                  type="number"
                  min="0"
                  step="0.000001"
                  placeholder="ex : 12.5"
                  class="input"
                >
              </div>

              <div class="flex flex-col gap-1.5">
                <span class="text-foreground text-sm font-medium">Devise</span>
                <div class="input flex items-center gap-2 !bg-panel-3 cursor-not-allowed" aria-readonly="true">
                  <Icon name="ph:currency-circle-dollar" class="text-accent" />
                  <span class="text-foreground text-sm font-medium">XRP</span>
                  <span class="text-muted text-xs ml-auto">réglé en XRP uniquement</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="royalty" class="text-foreground text-sm font-medium">Royalties</label>
              <div class="relative">
                <input
                  id="royalty"
                  v-model.number="form.royaltyPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  class="input pr-10"
                >
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
              </div>
              <p class="text-muted text-xs">Part reversée à chaque revente (0 à 100 %).</p>
            </div>
          </section>

          <!-- Step 3: Fichiers -->
          <section v-else key="3" class="surface p-8 flex flex-col gap-6">
            <div class="flex flex-col gap-1.5">
              <label for="tags" class="text-foreground text-sm font-medium">Tags</label>
              <input
                id="tags"
                v-model.trim="form.tags"
                type="text"
                placeholder="cyberpunk, texture, 4k"
                class="input"
              >
              <p class="text-muted text-xs">Séparés par des virgules.</p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="file" class="text-foreground text-sm font-medium">
                Fichier de l'asset <span class="text-danger">*</span>
              </label>
              <input
                id="file"
                type="file"
                class="input file:mr-3 file:rounded-md file:border-0 file:bg-panel-3 file:px-3 file:py-1.5 file:text-foreground"
                @change="onFilePick"
              >
              <p class="text-muted text-xs">
                {{ fileName ? `Sélectionné : ${fileName}` : 'Le fichier que l\'acheteur téléchargera (50 Mo max).' }}
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="thumbnail" class="text-foreground text-sm font-medium">
                Miniature <span class="text-muted font-normal">(image, optionnel)</span>
              </label>
              <input
                id="thumbnail"
                type="file"
                accept="image/*"
                class="input file:mr-3 file:rounded-md file:border-0 file:bg-panel-3 file:px-3 file:py-1.5 file:text-foreground"
                @change="onThumbnailPick"
              >
              <p class="text-muted text-xs">
                {{ thumbnailName
                  ? `Sélectionné : ${thumbnailName}`
                  : 'Visuel affiché sur le marketplace. Sans miniature, votre fichier est réutilisé s\'il est une image.' }}
              </p>
            </div>
          </section>
        </Transition>

        <p v-if="error" class="text-danger text-sm" role="alert">{{ error }}</p>

        <div class="flex items-center justify-between gap-3">
          <NuxtLink v-if="currentStep === 1" to="/profile" class="ghost-btn">Annuler</NuxtLink>
          <button v-else type="button" class="ghost-btn" @click="prevStep">
            <Icon name="ph:arrow-left" class="text-base" />
            Retour
          </button>

          <button v-if="currentStep < 3" type="button" class="primary-btn px-6" @click="nextStep">
            Suivant
            <Icon name="ph:arrow-right" class="text-base" />
          </button>
          <button v-else type="submit" class="primary-btn px-6">Créer et publier</button>
        </div>
      </form>

      <!-- ── Steps 1→3: the pipeline ── -->
      <section v-else class="surface p-6 flex flex-col gap-6">
        <ol class="flex flex-col gap-4">
          <li v-for="s in steps" :key="s.key" class="flex items-center gap-3">
            <span class="shrink-0 w-6 h-6 flex items-center justify-center">
              <Icon v-if="s.status === 'done'" name="ph:check-circle-fill" class="text-success text-xl" />
              <Icon v-else-if="s.status === 'error'" name="ph:warning-circle-fill" class="text-danger text-xl" />
              <span
                v-else-if="s.status === 'active'"
                class="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin"
              />
              <Icon v-else-if="s.status === 'current'" name="ph:dot-outline-fill" class="text-accent text-2xl" />
              <Icon v-else name="ph:circle" class="text-muted-2 text-xl" />
            </span>
            <span
              class="text-sm"
              :class="s.status === 'pending' ? 'text-muted' : 'text-foreground font-medium'"
            >
              {{ s.label }}
            </span>
          </li>
        </ol>

        <!-- Step 2 wallet selection: user picks the signer for the mint. -->
        <div v-if="phase === 'tokenize'" class="flex flex-col gap-3">
          <p class="text-muted text-sm">
            Choisissez le wallet qui signera le mint XRPL de cet asset.
          </p>
          <AuthWalletPicker :pending="pendingWallet" :step="tokenizeStep" @select="onWalletSelect" />
          <p v-if="error" class="text-danger text-sm" role="alert">{{ error }}</p>
        </div>

        <!-- Step 3 recovery: the draft + NFT exist, only the publish call failed. -->
        <div v-else-if="phase === 'publish-retry'" class="flex flex-col gap-3">
          <p v-if="error" class="text-danger text-sm" role="alert">{{ error }}</p>
          <div class="flex items-center gap-3">
            <button type="button" class="primary-btn px-6" @click="runPublish">Réessayer la publication</button>
            <NuxtLink to="/profile" class="ghost-btn">Plus tard</NuxtLink>
          </div>
        </div>
      </section>
  </div>
</template>

<script setup lang="ts">
import type { AssetCard, CategoryWithCount, CreateAssetBody } from '~/types/asset'
import { WalletRejectedError, type WalletId } from '~/lib/wallets'

definePageMeta({ middleware: 'auth' })

useHead({ title: 'Publier un asset' })

const DISTRIBUTION_MODES = [
  { value: 'unlimited', label: 'Illimité', hint: 'Ventes illimitées' },
  { value: 'limited', label: 'Limité', hint: 'Nombre de ventes plafonné' },
  { value: 'unique', label: 'Unique', hint: 'Un seul acquéreur' },
] as const

type DistributionMode = (typeof DISTRIBUTION_MODES)[number]['value']
type Phase = 'form' | 'creating' | 'tokenize' | 'publishing' | 'publish-retry'
// 'current' = the pipeline is paused here waiting for a user action (wallet pick),
// as opposed to 'active' which means work is actually running.
type StepStatus = 'pending' | 'current' | 'active' | 'done' | 'error'

const assets = useAssets()
const { step: tokenizeStep, tokenize } = useTokenize()

// Public data, SSR-fetched via the /api proxy. Empty on failure — non-blocking.
const { data: categoriesData } = await useAsyncData('asset-new-categories', () => assets.categories())
const categoriesList = computed<CategoryWithCount[]>(() => categoriesData.value ?? [])

const form = reactive({
  title: '',
  shortDescription: '',
  description: '',
  categoryIds: [] as number[],
  distributionMode: 'unlimited' as DistributionMode,
  maxDownloads: null as number | null,
  isFree: false,
  basePrice: null as number | null,
  royaltyPercent: 0 as number,
  tags: '',
})

// Uploaded files (kept out of the reactive form — File objects aren't JSON).
const file = ref<File | null>(null)
const thumbnail = ref<File | null>(null)
const fileName = computed(() => file.value?.name ?? '')
const thumbnailName = computed(() => thumbnail.value?.name ?? '')

function onFilePick(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
}
function onThumbnailPick(e: Event) {
  thumbnail.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

const phase = ref<Phase>('form')
const created = ref<AssetCard | null>(null)
const tokenized = ref(false)
const pendingWallet = ref<WalletId | null>(null)
const error = ref<string | null>(null)

// ── Form wizard (step 1 of the pipeline, split into 3 screens) ──
// Same fields, same validation rules — only the presentation changes: one
// section at a time instead of all three stacked. Reusing the title input's
// native `required`/`minlength` via reportValidity() means the browser shows
// the exact same validation message it always did, just triggered by
// "Suivant" instead of the final submit.
const WIZARD_STEPS = [
  { key: 'content', label: 'Contenu' },
  { key: 'pricing', label: 'Distribution & prix' },
  { key: 'files', label: 'Fichiers' },
] as const

const currentStep = ref<1 | 2 | 3>(1)
const furthestStep = ref<1 | 2 | 3>(1)
const direction = ref<'forward' | 'backward'>('forward')
const titleInputRef = ref<HTMLInputElement | null>(null)

function stepDotClass(n: number) {
  if (n < currentStep.value) return 'bg-accent border-accent text-white'
  if (n === currentStep.value) return 'border-accent text-accent bg-panel-3'
  return 'border-line text-muted-2 bg-transparent'
}

function nextStep() {
  if (currentStep.value === 1 && !titleInputRef.value?.reportValidity()) return
  error.value = null
  direction.value = 'forward'
  currentStep.value = Math.min(3, currentStep.value + 1) as 1 | 2 | 3
  furthestStep.value = Math.max(furthestStep.value, currentStep.value) as 1 | 2 | 3
}

function prevStep() {
  error.value = null
  direction.value = 'backward'
  currentStep.value = Math.max(1, currentStep.value - 1) as 1 | 2 | 3
}

function goToStep(n: number) {
  if (n < 1 || n > 3 || n > furthestStep.value) return
  error.value = null
  direction.value = n > currentStep.value ? 'forward' : 'backward'
  currentStep.value = n as 1 | 2 | 3
}

function toggleCategory(id: number) {
  const i = form.categoryIds.indexOf(id)
  if (i === -1) form.categoryIds.push(id)
  else form.categoryIds.splice(i, 1)
}

// v-model.number leaves an empty field as '' at runtime; coerce anything
// non-finite back to null so the API gets clean numbers.
function numOrNull(v: number | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function clampPercent(v: number | null): number {
  const n = numOrNull(v) ?? 0
  return Math.min(100, Math.max(0, n))
}

function buildBody(): CreateAssetBody {
  const tags = form.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
  return {
    title: form.title.trim(),
    shortDescription: form.shortDescription.trim() || null,
    description: form.description.trim() || null,
    categoryIds: form.categoryIds,
    distributionMode: form.distributionMode,
    maxDownloads: form.distributionMode === 'limited' ? numOrNull(form.maxDownloads) : null,
    isFree: form.isFree,
    basePrice: form.isFree ? null : numOrNull(form.basePrice),
    currency: 'XRP',
    // % → basis points: 12.5 % → 1250 bps (API contract, 0–10000).
    royaltyBps: Math.round(clampPercent(form.royaltyPercent) * 100),
    tags,
  }
}

const steps = computed<{ key: string; label: string; status: StepStatus }[]>(() => [
  {
    key: 'create',
    label: 'Création + upload du fichier',
    status: created.value ? 'done' : phase.value === 'creating' ? 'active' : 'pending',
  },
  {
    key: 'tokenize',
    label: 'Tokenisation on-chain (mint XRPL)',
    status: tokenized.value
      ? 'done'
      : pendingWallet.value
        ? 'active'
        : phase.value === 'tokenize'
          ? 'current'
          : 'pending',
  },
  {
    key: 'publish',
    label: 'Publication',
    status: phase.value === 'publishing'
      ? 'active'
      : phase.value === 'publish-retry'
        ? 'error'
        : 'pending',
  },
])

// Step 1 — create the Draft asset and upload its file(s).
async function onSubmit() {
  error.value = null
  if (!file.value) {
    error.value = 'Ajoutez le fichier de l\'asset avant de publier.'
    return
  }
  phase.value = 'creating'
  try {
    const draft = await assets.create(buildBody())
    await assets.uploadFile(draft.id, file.value)
    // The thumbnail is the asset's public visual. When the main file is
    // itself an image and no dedicated thumbnail was picked, reuse it —
    // a seller uploading an image expects THAT image on the card.
    const displayImage = thumbnail.value
      ?? (file.value.type.startsWith('image/') ? file.value : null)
    if (displayImage) {
      await assets.uploadThumbnail(draft.id, displayImage)
    }
    created.value = draft
    phase.value = 'tokenize'
  } catch (err) {
    error.value = toApiError(err)?.message ?? 'Impossible de créer le brouillon, réessayez.'
    phase.value = 'form'
  }
}

// Step 2 — mint the NFT with the chosen wallet, then chain into publish.
async function onWalletSelect(id: WalletId) {
  if (!created.value) return
  error.value = null
  pendingWallet.value = id
  try {
    await tokenize(created.value.id, id)
    tokenized.value = true
    await runPublish()
  } catch (err) {
    // ALREADY_TOKENIZED on a retry means a previous confirm DID reach the
    // server (e.g. the client timed out while the NFT was being recorded):
    // the asset is tokenized — continue to publish instead of showing an error.
    if (toApiError(err)?.code === 'ALREADY_TOKENIZED') {
      tokenized.value = true
      await runPublish()
      return
    }
    // The draft still exists on the API; the user can pick a wallet and retry.
    // A retry re-confirms the already-signed mint instead of minting again.
    error.value = toApiError(err)?.message
      ?? (err instanceof WalletRejectedError ? err.message : null)
      ?? (isNetworkError(err)
        ? 'Connexion au serveur impossible. Votre brouillon est conservé — relancez le mint.'
        : 'La tokenisation a échoué. Votre brouillon est conservé — vous pouvez relancer le mint.')
  } finally {
    pendingWallet.value = null
  }
}

// Step 3 — publish. Reachable both from the happy path and the retry button.
async function runPublish() {
  if (!created.value) return
  error.value = null
  phase.value = 'publishing'
  try {
    const published = await assets.publish(created.value.id)
    await navigateTo(`/assets/${published.slug ?? published.id}`)
  } catch (err) {
    error.value = toApiError(err)?.message ?? 'La publication a échoué, réessayez.'
    phase.value = 'publish-retry'
  }
}
</script>

<style scoped>
.slide-next-enter-active, .slide-next-leave-active,
.slide-prev-enter-active, .slide-prev-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.slide-next-enter-from { opacity: 0; transform: translateX(24px); }
.slide-next-leave-to { opacity: 0; transform: translateX(-24px); }
.slide-prev-enter-from { opacity: 0; transform: translateX(-24px); }
.slide-prev-leave-to { opacity: 0; transform: translateX(24px); }

@media (prefers-reduced-motion: reduce) {
  .slide-next-enter-active, .slide-next-leave-active,
  .slide-prev-enter-active, .slide-prev-leave-active {
    transition: opacity 0.15s ease;
  }
  .slide-next-enter-from, .slide-next-leave-to,
  .slide-prev-enter-from, .slide-prev-leave-to {
    transform: none;
  }
}
</style>
