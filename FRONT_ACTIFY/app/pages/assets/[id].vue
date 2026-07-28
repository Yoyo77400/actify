<template>
  <div class="flex flex-col gap-6">
    <NuxtLink to="/assets" class="inline-flex items-center gap-1.5 text-muted text-sm hover:text-foreground transition-colors w-fit">
      <Icon name="ph:arrow-left" class="text-base" />
      Retour au marketplace
    </NuxtLink>

    <!-- Not found -->
    <div v-if="loadError?.notFound" class="surface p-10 flex flex-col items-center gap-3 text-center">
      <Icon name="ph:magnifying-glass" class="text-3xl text-muted" />
      <h1 class="ethnocentric text-foreground text-lg">Asset introuvable</h1>
      <p class="text-muted text-sm max-w-sm">
        Cet asset n'existe pas, a été retiré, ou n'est pas encore publié.
      </p>
      <NuxtLink to="/assets" class="primary-btn mt-2">Explorer le marketplace</NuxtLink>
    </div>

    <!-- Generic load error -->
    <div v-else-if="loadError" class="surface p-10 flex flex-col items-center gap-3 text-center">
      <Icon name="ph:warning-circle" class="text-3xl text-danger" />
      <h1 class="ethnocentric text-foreground text-lg">Chargement impossible</h1>
      <p class="text-muted text-sm max-w-sm" role="alert">{{ loadError.message }}</p>
      <button type="button" class="primary-btn mt-2" @click="refresh()">Réessayer</button>
    </div>

    <!-- Detail -->
    <section v-else-if="asset" class="grid grid-cols-[minmax(0,1fr)_360px] max-lg:grid-cols-1 gap-[18px] items-start">
      <!-- Main column -->
      <div class="flex flex-col gap-[18px]">
        <div class="surface overflow-hidden group relative cursor-zoom-in" @click="lightboxOpen = true">
          <img
            class="w-full aspect-[3/2] object-cover bg-panel-3"
            :src="thumbnailUrl"
            :alt="asset.title"
          >
          <span
            class="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
          >
            <Icon
              name="ph:magnifying-glass-plus"
              class="text-2xl text-white opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </span>
        </div>

        <div class="surface p-5 flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <div class="flex items-start justify-between gap-3">
              <h1 class="ethnocentric text-foreground text-xl leading-snug">{{ asset.title }}</h1>
              <button
                v-if="isLoggedIn"
                type="button"
                class="ghost-btn !min-h-9 !w-9 !p-0 shrink-0 flex items-center justify-center"
                :aria-label="isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                :disabled="togglingFavorite"
                @click="toggleFavorite"
              >
                <Icon
                  :name="isFavorited ? 'ph:heart-fill' : 'ph:heart'"
                  class="text-lg"
                  :class="isFavorited ? 'text-danger' : ''"
                />
              </button>
            </div>

            <p class="text-sm text-muted">
              Par
              <NuxtLink
                v-if="asset.seller.username"
                :to="`/artist/${asset.seller.username}/items`"
                class="text-accent hover:underline"
              >{{ sellerName }}</NuxtLink>
              <span v-else class="text-foreground">{{ sellerName }}</span>
            </p>
          </div>

          <div class="flex items-center flex-wrap gap-4 text-sm text-muted">
            <span class="inline-flex items-center gap-1.5">
              <Icon name="ph:eye" class="text-base" />
              {{ asset.viewsCount }} vues
            </span>

            <span v-if="asset.averageRating != null" class="inline-flex items-center gap-1.5">
              <span class="inline-flex items-center gap-0.5">
                <Icon
                  v-for="(filled, i) in stars"
                  :key="i"
                  :name="filled ? 'ph:star-fill' : 'ph:star'"
                  class="text-sm"
                  :class="filled ? 'text-accent-2' : 'text-muted-2'"
                />
              </span>
              <span class="text-foreground">{{ asset.averageRating.toFixed(1) }}/5</span>
              <span>({{ asset.reviewsCount }} avis)</span>
            </span>
          </div>

          <div v-if="asset.categories.length" class="flex flex-wrap gap-2">
            <span v-for="cat in asset.categories" :key="cat.id" class="chip chip--active !h-8 text-xs">
              {{ cat.name }}
            </span>
          </div>

          <p v-if="asset.shortDescription" class="text-foreground text-sm leading-relaxed">
            {{ asset.shortDescription }}
          </p>

          <p v-if="asset.description" class="text-muted text-sm leading-relaxed whitespace-pre-line">
            {{ asset.description }}
          </p>

          <div v-if="asset.tags.length" class="flex flex-wrap gap-2 pt-1">
            <span v-for="tag in asset.tags" :key="tag" class="pill-badge text-muted">#{{ tag }}</span>
          </div>
        </div>
      </div>

      <!-- Aside column -->
      <aside class="flex flex-col gap-[18px]">
        <!-- Buy / download panel -->
        <div class="surface p-5 flex flex-col gap-4">
          <div>
            <p class="text-muted text-xs uppercase tracking-widest">Prix</p>
            <p class="ethnocentric text-foreground text-2xl mt-1">{{ priceLabel }}</p>
          </div>

          <div
            v-if="distributionSummary || royaltyPercent"
            class="flex flex-col gap-1.5 pt-3 border-t border-line text-xs"
          >
            <div v-if="distributionSummary" class="flex items-center justify-between gap-2">
              <span class="text-muted inline-flex items-center gap-1.5">
                <Icon name="ph:stack" class="text-sm" />
                {{ distributionLabelText }}
              </span>
              <span class="text-foreground">{{ distributionSummary }}</span>
            </div>
            <p v-if="royaltyPercent" class="text-muted inline-flex items-center gap-1.5">
              <Icon name="ph:percent" class="text-sm" />
              {{ royaltyPercent }}% de royalties reversés à chaque revente
            </p>
          </div>

          <!-- Entitled: the file is the deliverable, it wins over everything else -->
          <template v-if="canDownload">
            <p class="text-success text-sm flex items-center gap-2">
              <Icon :name="entitlement.icon" class="text-base shrink-0" />
              {{ entitlement.label }}
            </p>

            <button type="button" class="primary-btn w-full" :disabled="downloading" @click="download">
              <span v-if="!downloading" class="flex items-center justify-center gap-2">
                <Icon name="ph:download-simple" class="text-base" />
                Télécharger
              </span>
              <span v-else class="flex items-center justify-center gap-2">
                <span class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Préparation…
              </span>
            </button>

            <p v-if="downloadError" class="text-danger text-xs" role="alert">{{ downloadError }}</p>
            <p v-if="confirmedTxHash" class="text-muted-2 text-xs font-mono break-all">
              Paiement confirmé · {{ confirmedTxHash }}
            </p>
          </template>

          <!-- Paid and settled, but the reload that unlocks the file didn't land -->
          <template v-else-if="confirmedTxHash">
            <p class="text-success text-sm flex items-center gap-2">
              <Icon name="ph:check-circle" class="text-lg shrink-0" />
              Paiement confirmé — la licence est à vous.
            </p>
            <p class="text-muted-2 text-xs font-mono break-all">{{ confirmedTxHash }}</p>
            <button type="button" class="primary-btn w-full" @click="refresh()">Afficher le téléchargement</button>
          </template>

          <NuxtLink v-else-if="!isLoggedIn" to="/auth/login" class="primary-btn w-full">
            {{ asset.isFree ? 'Se connecter pour télécharger' : 'Se connecter pour acheter' }}
          </NuxtLink>

          <!-- Free, signed in: the only ways here are "no file yet" and "not published" -->
          <p v-else-if="asset.isFree" class="text-muted text-sm flex items-center gap-2">
            <Icon name="ph:file-dashed" class="text-base shrink-0" />
            {{ asset.hasFile
              ? 'Téléchargeable une fois l\'asset publié.'
              : 'Aucun fichier n\'est encore attaché à cet asset.' }}
          </p>

          <template v-else-if="isOwner">
            <button type="button" class="primary-btn w-full" disabled>Acheter</button>
            <p class="text-muted-2 text-xs text-center">Vous êtes le vendeur de cet asset.</p>
          </template>

          <!-- Sold out: no buy affordance at all. The API refuses the order
               anyway, but showing the button invited a real XRP payment for a
               piece that can never be delivered. -->
          <template v-else-if="asset.soldOut">
            <button type="button" class="primary-btn w-full" disabled>
              {{ asset.distributionMode === 'unique' ? 'Pièce déjà vendue' : 'Épuisé' }}
            </button>
            <p class="text-muted-2 text-xs text-center">
              {{ asset.distributionMode === 'unique'
                ? 'Cette pièce unique a trouvé son acquéreur.'
                : 'Toutes les licences de cet asset ont été vendues.' }}
            </p>
          </template>

          <!-- Paid: order + wallet payment in a single gesture -->
          <template v-else>
            <p v-if="order" class="text-success text-sm flex items-center gap-2">
              <Icon name="ph:check-circle" class="text-lg shrink-0" />
              Commande créée — en attente de paiement.
            </p>

            <p v-if="alreadySigned" class="text-warning text-xs leading-relaxed flex gap-2" role="alert">
              <Icon name="ph:warning" class="text-sm shrink-0 mt-0.5" />
              <span>Paiement déjà signé dans votre wallet : relancez pour relire le ledger, ne payez pas deux fois.</span>
            </p>

            <div>
              <p class="text-muted text-xs uppercase tracking-widest mb-2">
                {{ alreadySigned ? 'Reprendre la vérification avec' : `Payer ${priceLabel} avec` }}
              </p>
              <AuthWalletPicker :pending="payingWith" :step="payStep" @select="buyAndPay" />
            </div>

            <p v-if="payError" class="text-danger text-xs" role="alert">{{ payError }}</p>

            <p class="text-muted-2 text-xs">
              Le wallet vous montre la transaction avant signature. Actify n'a jamais accès à vos fonds.
            </p>

            <!-- Always reachable, and deliberately not gated on an existing order:
                 the wallet buttons above are dead without a desktop extension, so
                 this is the only way to buy from a phone, Xaman or an exchange —
                 and the only way back for a payment whose confirmation was lost. -->
            <details class="group">
              <summary
                class="list-none cursor-pointer text-muted text-xs hover:text-foreground inline-flex items-center gap-1"
              >
                <Icon name="ph:caret-right" class="text-sm transition-transform group-open:rotate-90" />
                Payer depuis un autre wallet / j'ai déjà payé
              </summary>

              <div v-if="!order" class="mt-3 flex flex-col gap-3">
                <p class="text-muted text-xs leading-relaxed">
                  Réglez depuis n'importe quel wallet XRP : générez les coordonnées, envoyez le montant
                  avec le DestinationTag exact, puis collez le hash de la transaction.
                </p>
                <button
                  type="button"
                  class="ghost-btn w-full"
                  :disabled="creatingOrder"
                  @click="createOrderForManualPayment"
                >
                  <span v-if="!creatingOrder">Obtenir les coordonnées de paiement</span>
                  <span v-else class="flex items-center justify-center gap-2">
                    <span class="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Création…
                  </span>
                </button>
              </div>

              <div v-else class="mt-3 flex flex-col gap-3">
                <div class="rounded-xl border border-line bg-panel-3 p-4 flex flex-col gap-3">
                  <div>
                    <p class="text-muted text-xs uppercase tracking-widest">Montant à envoyer</p>
                    <p class="text-foreground text-lg font-mono mt-1">{{ order.amount }} {{ order.currency }}</p>
                  </div>

                  <div>
                    <p class="text-muted text-xs uppercase tracking-widest mb-1">Adresse de paiement</p>
                    <div class="flex items-center gap-2">
                      <span
                        class="text-foreground text-xs font-mono break-all min-w-0 flex-1"
                        :title="order.paymentAddress"
                      >{{ order.paymentAddress }}</span>
                      <button
                        type="button"
                        class="ghost-btn !min-h-8 px-2 shrink-0"
                        :aria-label="`Copier l'adresse`"
                        @click="copy(order.paymentAddress, 'address')"
                      >
                        <Icon :name="copied === 'address' ? 'ph:check' : 'ph:copy'" class="text-base" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p class="text-muted text-xs uppercase tracking-widest mb-1">DestinationTag</p>
                    <div class="flex items-center gap-2">
                      <span class="text-foreground text-base font-mono">{{ order.paymentTag }}</span>
                      <button
                        type="button"
                        class="ghost-btn !min-h-8 px-2 shrink-0"
                        aria-label="Copier le DestinationTag"
                        @click="copy(String(order.paymentTag), 'tag')"
                      >
                        <Icon :name="copied === 'tag' ? 'ph:check' : 'ph:copy'" class="text-base" />
                      </button>
                    </div>
                  </div>
                </div>

                <p class="text-warning text-xs leading-relaxed flex gap-2">
                  <Icon name="ph:warning" class="text-sm shrink-0 mt-0.5" />
                  <span>Envoyez le paiement avec ce DestinationTag exact, sinon la commande ne pourra pas être confirmée.</span>
                </p>

                <form class="flex flex-col gap-2" @submit.prevent="confirmPayment">
                  <label for="payment-tx-hash" class="text-muted text-xs uppercase tracking-widest">
                    Hash de transaction XRPL
                  </label>
                  <input
                    id="payment-tx-hash"
                    v-model.trim="txHash"
                    class="input font-mono"
                    type="text"
                    inputmode="text"
                    maxlength="64"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="64 caractères hexadécimaux"
                  >
                  <button type="submit" class="ghost-btn w-full" :disabled="confirming || !isTxHashValid">
                    <span v-if="!confirming">Confirmer le paiement</span>
                    <span v-else class="flex items-center justify-center gap-2">
                      <span class="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Vérification…
                    </span>
                  </button>
                  <p v-if="confirmError" class="text-danger text-xs" role="alert">{{ confirmError }}</p>
                </form>

                <p class="text-muted-2 text-xs">
                  Expire le {{ new Date(order.expiresAt).toLocaleString('fr-FR') }}.
                </p>
              </div>
            </details>
          </template>
        </div>

        <!-- Tokenization panel -->
        <div class="surface p-5 flex flex-col gap-3">
          <p class="text-muted text-xs uppercase tracking-widest">Tokenisation</p>

          <template v-if="asset.tokenized && asset.nft">
            <span class="pill-badge text-success bg-[rgba(29,212,126,0.12)] border-[rgba(29,212,126,0.4)] w-fit">
              <Icon name="ph:seal-check" class="text-sm" />
              Tokenisé sur XRP Ledger
            </span>

            <div>
              <p class="text-muted text-xs mb-1">NFTokenID</p>
              <span class="text-foreground text-xs font-mono break-all" :title="asset.nft.nftokenId">
                {{ truncateMiddle(asset.nft.nftokenId) }}
              </span>
            </div>

            <a
              :href="`https://testnet.xrpl.org/transactions/${asset.nft.mintTxHash}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-accent text-xs hover:underline inline-flex items-center gap-1 w-fit"
            >
              Voir la transaction de mint
              <Icon name="ph:arrow-up-right" class="text-sm" />
            </a>
          </template>

          <p v-else class="text-muted-2 text-sm flex items-center gap-2">
            <Icon name="ph:circle-dashed" class="text-base shrink-0" />
            Pas encore tokenisé.
          </p>
        </div>
      </aside>
    </section>

    <Teleport to="body">
      <div v-if="lightboxOpen" class="lightbox-overlay" @click.self="lightboxOpen = false">
        <img :src="thumbnailUrl" :alt="asset?.title" class="lightbox-img">
        <button
          type="button"
          class="ghost-btn !absolute top-4 right-4 !min-h-9 px-2.5"
          aria-label="Fermer"
          @click="lightboxOpen = false"
        >
          <Icon name="ph:x" class="text-lg" />
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { WalletRejectedError, type WalletId } from '~/lib/wallets'
import type { AssetDetail, EntitlementReason, OrderCreated } from '~/types/asset'

interface LoadFailure {
  notFound: boolean
  message: string
}

// Why the viewer already has access, in the words that make sense on this page.
const ENTITLEMENT_LABELS: Record<EntitlementReason, { icon: string; label: string }> = {
  free: { icon: 'ph:download-simple', label: 'Téléchargement gratuit — aucun paiement requis.' },
  purchase: { icon: 'ph:seal-check', label: 'Licence acquise — cet asset est à vous.' },
  nft_owner: { icon: 'ph:wallet', label: 'NFT détenu dans votre wallet — accès débloqué.' },
}

type LoadResult =
  | { ok: true; asset: AssetDetail }
  | { ok: false; error: LoadFailure }

const route = useRoute()
const assets = useAssets()
const orders = useOrders()
const downloads = useDownloads()
const favorites = useFavorites()
const { step: payStep, pay, hasSignedPayment, forgetSignedPayment } = usePayOrder()
const { user, isLoggedIn } = useAuth()

const assetId = String(route.params.id)

// The API throws on error; normalize inside the handler so `toApiError` runs on
// the raw FetchError (Nuxt would otherwise wrap it and break `instanceof`).
// Keyed by viewer: the payload carries viewerEntitlement, so signing in must
// not be served the anonymous verdict from cache.
const { data, refresh } = await useAsyncData<LoadResult>(`asset:${user.value?.id ?? 'guest'}:${assetId}`, async () => {
  try {
    return { ok: true, asset: await assets.get(assetId) }
  } catch (err) {
    const apiErr = toApiError(err)
    if (apiErr?.code === 'NOT_FOUND') {
      return { ok: false, error: { notFound: true, message: apiErr.message } }
    }
    return {
      ok: false,
      error: {
        notFound: false,
        message: apiErr?.message
          ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Impossible de charger cet asset.'),
      },
    }
  }
})

const asset = computed<AssetDetail | null>(() => {
  const d = data.value
  return d?.ok ? d.asset : null
})
const loadError = computed<LoadFailure | null>(() => {
  const d = data.value
  return d && !d.ok ? d.error : null
})

const thumbnailUrl = computed(() => {
  const a = asset.value
  if (!a) return ''
  return assetImage(a.thumbnailCid, a.id)
})

const sellerName = computed(() => {
  const s = asset.value?.seller
  return s?.displayName ?? s?.username ?? 'Vendeur'
})

const priceLabel = computed(() => {
  const a = asset.value
  if (!a) return ''
  if (a.isFree) return 'Gratuit'
  if (a.price == null) return 'Prix non défini'
  return `${a.price} ${a.currency ?? ''}`.trim()
})

const distributionLabelText = computed(() => (asset.value ? distributionLabel(asset.value.distributionMode) : ''))
const distributionSummary = computed(() => (asset.value ? distributionText(asset.value) : null))
const royaltyPercent = computed(() => {
  const bps = asset.value?.royaltyBps
  if (!bps) return null
  const pct = bps / 100
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(2)
})

const lightboxOpen = ref(false)

const stars = computed(() => {
  const r = asset.value?.averageRating
  if (r == null) return []
  const rounded = Math.round(r)
  return Array.from({ length: 5 }, (_, i) => i < rounded)
})

const isOwner = computed(() => !!user.value && user.value.id === asset.value?.seller.id)

// ─── Favorite ───
const isFavorited = ref(false)
const togglingFavorite = ref(false)
watch(asset, (a) => {
  if (a) isFavorited.value = a.isFavorited
}, { immediate: true })

async function toggleFavorite() {
  const a = asset.value
  if (!a || togglingFavorite.value) return
  togglingFavorite.value = true
  try {
    if (isFavorited.value) {
      await favorites.remove(a.id)
      isFavorited.value = false
    } else {
      await favorites.add(a.id)
      isFavorited.value = true
    }
  } catch {
    // Best-effort toggle: on failure the icon simply stays as it was: no
    // dedicated error UI for a low-stakes action the user can just retry.
  } finally {
    togglingFavorite.value = false
  }
}

function truncateMiddle(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

// ─── Download ───
// The API resolves the entitlement (free / purchased / NFT held on-chain) and
// says so on the detail payload — the button only mirrors that verdict.
const canDownload = computed(() => asset.value?.viewerEntitlement.canDownload === true)
const entitlement = computed(() => {
  // The seller holds the NFToken they minted, so the API answers 'nft_owner'
  // for them — accurate, but odd wording on your own asset.
  if (isOwner.value) return { icon: 'ph:user-circle', label: 'Votre asset — accès à votre fichier source.' }
  const reason = asset.value?.viewerEntitlement.reason
  return reason ? ENTITLEMENT_LABELS[reason] : ENTITLEMENT_LABELS.free
})

const downloading = ref(false)
const downloadError = ref<string | null>(null)

async function download() {
  const a = asset.value
  if (!a) return
  downloading.value = true
  downloadError.value = null
  try {
    await downloads.download(a.id)
  } catch (err) {
    downloadError.value = toApiError(err)?.message
      ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Le téléchargement n\'a pas pu démarrer.')
  } finally {
    downloading.value = false
  }
}

// ─── Buy flow ───
const { data: recoveredOrder } = await useAsyncData<OrderCreated | null>(
  `pending-order:${user.value?.id ?? 'guest'}:${assetId}`,
  async () => {
    const currentAsset = asset.value
    if (!isLoggedIn.value || !currentAsset || currentAsset.isFree || isOwner.value) return null
    return orders.getPendingForAsset(currentAsset.id)
  },
)

const order = ref<OrderCreated | null>(recoveredOrder.value ?? null)
const payingWith = ref<WalletId | null>(null)
const payError = ref<string | null>(null)
// The signed-but-unconfirmed hash lives in browser storage, unreadable during
// SSR — mirror it on mount and after each attempt, so the warning can render
// without a hydration mismatch.
const alreadySigned = ref(false)
function syncAlreadySigned() {
  alreadySigned.value = !!order.value && hasSignedPayment(order.value.id)
}
onMounted(syncAlreadySigned)
const txHash = ref('')
const confirming = ref(false)
const confirmError = ref<string | null>(null)
const confirmedTxHash = ref<string | null>(null)
const isTxHashValid = computed(() => /^[0-9a-fA-F]{64}$/.test(txHash.value))

/**
 * One gesture for the buyer, three steps underneath: create the order (it
 * carries the DestinationTag the payment must quote), have the wallet sign and
 * submit the XRP Payment, then let the backend verify it on the ledger.
 */
async function buyAndPay(walletId: WalletId) {
  const a = asset.value
  if (!a || payingWith.value) return

  payingWith.value = walletId
  payError.value = null
  try {
    const pendingOrder = order.value ?? await orders.create(a.id)
    order.value = pendingOrder

    const confirmation = await pay(pendingOrder, walletId)
    pendingOrder.status = confirmation.status
    confirmedTxHash.value = confirmation.txHash
    await refresh()
  } catch (err) {
    payError.value = err instanceof WalletRejectedError
      ? err.message
      : toApiError(err)?.message
      ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Le paiement n\'a pas pu être finalisé.')
  } finally {
    syncAlreadySigned()
    payingWith.value = null
  }
}

// Same order creation as buyAndPay, minus the wallet. The XRPL is open: the
// buyer can settle from anything that speaks Payment, they just need the
// address and the DestinationTag — which only exist once the order does.
const creatingOrder = ref(false)
async function createOrderForManualPayment() {
  const a = asset.value
  if (!a || order.value || creatingOrder.value) return

  creatingOrder.value = true
  payError.value = null
  try {
    order.value = await orders.create(a.id)
  } catch (err) {
    payError.value = toApiError(err)?.message
      ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'La commande n\'a pas pu être créée.')
  } finally {
    creatingOrder.value = false
  }
}

async function confirmPayment() {
  const pendingOrder = order.value
  if (!pendingOrder || !isTxHashValid.value) return

  confirming.value = true
  confirmError.value = null
  try {
    const confirmed = await orders.confirm(pendingOrder.id, txHash.value)
    pendingOrder.status = confirmed.status
    confirmedTxHash.value = confirmed.txHash
    // Settled by hand: the wallet resume point is now dead weight.
    forgetSignedPayment(pendingOrder.id)
    syncAlreadySigned()
    await refresh()
  } catch (err) {
    const apiErr = toApiError(err)
    confirmError.value = apiErr?.message
      ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Le paiement n\'a pas pu être vérifié.')
  } finally {
    confirming.value = false
  }
}

const copied = ref<string | null>(null)
async function copy(value: string, key: string) {
  await navigator.clipboard.writeText(value)
  copied.value = key
  setTimeout(() => {
    if (copied.value === key) copied.value = null
  }, 1800)
}

useHead(() => ({
  title: asset.value?.title ?? (loadError.value?.notFound ? 'Asset introuvable' : 'Asset'),
  meta: [
    {
      name: 'description',
      content: asset.value?.shortDescription ?? asset.value?.description ?? 'Asset sur le marketplace Actify.',
    },
  ],
}))
</script>

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
}
.lightbox-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
}
</style>
