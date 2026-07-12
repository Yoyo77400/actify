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
        <div class="surface overflow-hidden">
          <img
            class="w-full aspect-[3/2] object-cover bg-panel-3"
            :src="thumbnailUrl"
            :alt="asset.title"
          >
        </div>

        <div class="surface p-5 flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <h1 class="ethnocentric text-foreground text-xl leading-snug">{{ asset.title }}</h1>

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
        <!-- Buy panel -->
        <div class="surface p-5 flex flex-col gap-4">
          <div>
            <p class="text-muted text-xs uppercase tracking-widest">Prix</p>
            <p class="ethnocentric text-foreground text-2xl mt-1">{{ priceLabel }}</p>
          </div>

          <!-- Order created -> payment instructions -->
          <div v-if="order" class="flex flex-col gap-3">
            <div class="flex items-center gap-2 text-success text-sm">
              <Icon name="ph:check-circle" class="text-lg shrink-0" />
              <span>Commande créée — en attente de paiement.</span>
            </div>

            <div class="rounded-xl border border-line bg-panel-3 p-4 flex flex-col gap-3">
              <div>
                <p class="text-muted text-xs uppercase tracking-widest">Montant à envoyer</p>
                <p class="text-foreground text-lg font-mono mt-1">{{ order.amount }} {{ order.currency }}</p>
              </div>

              <div>
                <p class="text-muted text-xs uppercase tracking-widest mb-1">Adresse de paiement</p>
                <div class="flex items-center gap-2">
                  <span class="text-foreground text-xs font-mono break-all min-w-0 flex-1" :title="order.paymentAddress">
                    {{ order.paymentAddress }}
                  </span>
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

            <p class="text-muted-2 text-xs">
              Expire le {{ new Date(order.expiresAt).toLocaleString('fr-FR') }}.
            </p>
          </div>

          <!-- No order yet -->
          <template v-else>
            <p v-if="asset.isFree" class="text-muted text-sm flex items-center gap-2">
              <Icon name="ph:download-simple" class="text-base text-success shrink-0" />
              Téléchargement gratuit — aucun paiement requis.
            </p>

            <NuxtLink
              v-else-if="!isLoggedIn"
              to="/auth/login"
              class="primary-btn w-full"
            >Se connecter pour acheter</NuxtLink>

            <template v-else-if="isOwner">
              <button type="button" class="primary-btn w-full" disabled>Acheter</button>
              <p class="text-muted-2 text-xs text-center">Vous êtes le vendeur de cet asset.</p>
            </template>

            <button
              v-else
              type="button"
              class="primary-btn w-full"
              :disabled="ordering"
              @click="buy"
            >
              <span v-if="!ordering">Acheter</span>
              <span v-else class="flex items-center justify-center gap-2">
                <span class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Création…
              </span>
            </button>

            <p v-if="orderError" class="text-danger text-xs" role="alert">{{ orderError }}</p>
            <NuxtLink
              v-if="orderErrorCode === 'WALLET_NOT_LINKED'"
              to="/settings/wallet"
              class="text-accent text-xs hover:underline"
            >Lier un wallet XRP →</NuxtLink>
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
  </div>
</template>

<script setup lang="ts">
import type { AssetDetail, OrderCreated } from '~/types/asset'

interface LoadFailure {
  notFound: boolean
  message: string
}

type LoadResult =
  | { ok: true; asset: AssetDetail }
  | { ok: false; error: LoadFailure }

const route = useRoute()
const assets = useAssets()
const { user, isLoggedIn } = useAuth()

const assetId = String(route.params.id)

// The API throws on error; normalize inside the handler so `toApiError` runs on
// the raw FetchError (Nuxt would otherwise wrap it and break `instanceof`).
const { data, refresh } = await useAsyncData<LoadResult>(`asset:${assetId}`, async () => {
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
  return a.thumbnailCid
    ? `https://ipfs.io/ipfs/${a.thumbnailCid}`
    : `https://picsum.photos/seed/${a.id}/600/400`
})

const sellerName = computed(() => {
  const s = asset.value?.seller
  return s?.displayName ?? s?.username ?? 'Vendeur'
})

const priceLabel = computed(() => {
  const a = asset.value
  if (!a) return ''
  if (a.isFree) return 'Gratuit'
  return `${a.price} ${a.currency ?? ''}`.trim()
})

const stars = computed(() => {
  const r = asset.value?.averageRating
  if (r == null) return []
  const rounded = Math.round(r)
  return Array.from({ length: 5 }, (_, i) => i < rounded)
})

const isOwner = computed(() => !!user.value && user.value.id === asset.value?.seller.id)

function truncateMiddle(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

// ─── Buy flow ───
const order = ref<OrderCreated | null>(null)
const ordering = ref(false)
const orderError = ref<string | null>(null)
const orderErrorCode = ref<string | null>(null)

async function buy() {
  const a = asset.value
  if (!a) return
  ordering.value = true
  orderError.value = null
  orderErrorCode.value = null
  try {
    order.value = await assets.createOrder(a.id)
  } catch (err) {
    const apiErr = toApiError(err)
    orderErrorCode.value = apiErr?.code ?? null
    orderError.value = apiErr?.message
      ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'La commande n\'a pas pu être créée.')
  } finally {
    ordering.value = false
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
