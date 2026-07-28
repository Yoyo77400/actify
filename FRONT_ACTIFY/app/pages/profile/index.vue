<template>
  <div v-if="view" class="flex flex-col gap-7">
    <ProfileHeader :user="view" @edit="editing = true" />
    <ProfileEditModal v-model="editing" />

    <div class="grid grid-cols-[1fr_300px] max-xl:grid-cols-1 gap-[18px]">
      <div class="flex flex-col gap-7">
        <ProfileCollections />

        <section>
          <CommonSectionHeader title="Mes assets" subtitle="Vos créations publiées et vos brouillons" />

          <AssetFilterBar
            :categories="categories"
            search-placeholder="Rechercher dans mes assets..."
            class="mb-4"
            @change="onListingsFiltersChange"
          />

          <p v-if="listingsError" class="surface p-8 text-center text-danger text-sm" role="alert">
            Impossible de charger vos assets pour le moment.
          </p>
          <div v-else-if="listings.length" class="grid grid-cols-2 max-md:grid-cols-1 gap-4">
            <!-- Owner view: unlike the public catalogue this also returns
                 drafts, so each card carries its status. -->
            <div v-for="item in listings" :key="item.id" class="relative">
              <span
                v-if="item.status !== 'Published'"
                class="pill-badge absolute top-3 left-3 z-10 bg-panel-3/90"
              >{{ item.status === 'Draft' ? 'Brouillon' : item.status }}</span>
              <button
                type="button"
                class="ghost-btn absolute top-3 right-3 z-10 !min-h-8 !w-8 !p-0 bg-panel-3/90"
                aria-label="Modifier"
                @click="editingAsset = item"
              >
                <Icon name="ph:pencil-simple" class="text-sm" />
              </button>
              <ArtistAssetCard :item="item" />
            </div>
          </div>
          <div v-else class="surface p-8 text-center">
            <p class="text-muted text-sm">
              {{ hasListingsFilters ? 'Aucun asset ne correspond à ces filtres.' : 'Aucun asset pour le moment.' }}
            </p>
            <NuxtLink v-if="!hasListingsFilters" to="/asset/new" class="text-accent text-sm hover:underline">
              Publier un premier asset
            </NuxtLink>
          </div>

          <AssetEditModal
            :asset="editingAsset"
            @close="editingAsset = null"
            @saved="editingAsset = null; refreshListings()"
          />
        </section>

        <section>
          <CommonSectionHeader title="Recent Activity" subtitle="Your latest transactions" />
          <div v-if="view.activity.length" class="surface overflow-hidden">
            <ProfileActivityRow
              v-for="(activity, i) in view.activity"
              :key="activity.id"
              :activity="activity"
              :last="i === view.activity.length - 1"
            />
          </div>
          <div v-else class="surface p-8 text-center">
            <p class="text-muted text-sm">Aucune activité pour le moment.</p>
          </div>
        </section>
      </div>

      <div class="flex flex-col gap-[18px]">
        <ProfileWalletCard :wallet="view.wallet" />
        <ProfileStatsCard :stats="view.stats" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AssetFilterState } from '~/components/asset/AssetFilterBar.vue'
import type { AssetCard, CategoryWithCount } from '~/types/asset'
import type { UserProfile } from '~/types/profile'

definePageMeta({ middleware: 'auth' })

useHead({ title: 'Mon profil' })

const { user } = useAuth()
const assets = useAssets()

const editing = ref(false)

// Same global list the marketplace uses - counts shown are platform-wide, not
// scoped to this seller, but the categories themselves are still correct to
// filter by. A failure here must not block the "my assets" section.
const { data: categories } = await useAsyncData(
  'profile-categories',
  () => assets.categories(),
  { default: () => [] as CategoryWithCount[] },
)

const listingsFilters = ref<AssetFilterState | null>(null)
const hasListingsFilters = computed(() => {
  const f = listingsFilters.value
  if (!f) return false
  return !!f.q || f.category !== null || f.isFree !== null || f.minPrice != null || f.maxPrice != null || f.mode !== null
})

// The owner's own listings — /creator/listings is scoped server-side to the
// caller (sellerId) and, unlike the public catalogue, includes drafts.
// Refetched after an edit so a freshly published asset shows up.
const { data: listingsData, error: listingsError, refresh: refreshListings } = await useAsyncData(
  'profile-listings',
  () => {
    const f = listingsFilters.value
    return assets.myListings(f
      ? {
          q: f.q || undefined,
          category: f.category ?? undefined,
          sort: f.sort,
          order: f.order,
          isFree: f.isFree ?? undefined,
          minPrice: f.minPrice ?? undefined,
          maxPrice: f.maxPrice ?? undefined,
          mode: f.mode ?? undefined,
        }
      : {})
  },
  { watch: [listingsFilters] },
)
const listings = computed(() => listingsData.value ?? [])
const editingAsset = ref<AssetCard | null>(null)

function onListingsFiltersChange(next: AssetFilterState) {
  listingsFilters.value = next
}

watch(editing, (open) => {
  if (!open) refreshListings()
})

// Adapts the API profile to the view-model the profile components consume.
// Collections/activity stay empty until listings & purchases land in the API.
const view = computed<UserProfile | null>(() => {
  const me = user.value
  if (!me) return null

  const primary = me.wallets.find(w => w.isPrimary) ?? me.wallets[0] ?? null

  return {
    displayName: me.displayName ?? me.username ?? 'Utilisateur Actify',
    username: me.username ? `@${me.username}` : (primary ? shortAddress(primary.address) : ''),
    // Both served by the API's /files/:key, with a deterministic local tile as
    // fallback — the old ipfs.io URL never resolved (storage is API-local) and
    // the cover was a hardcoded stock photo.
    avatar: avatarImage(me.avatarCid, me.id),
    cover: profileBannerImage(me.bannerCid),
    bio: me.bio ?? '',
    joinedAt: new Date(me.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
    followersCount: me.stats.followersCount,
    followingCount: me.stats.followingCount,
    wallet: {
      address: primary ? shortAddress(primary.address) : 'Aucun wallet',
      balance: '—',
      currency: 'XRP',
      chain: 'XRP Ledger',
    },
    stats: [
      { label: 'Assets en vente', value: String(me.stats.listingsCount) },
      { label: 'Achats', value: String(me.stats.purchasesCount) },
      { label: 'Téléchargements', value: String(me.stats.downloadsCount) },
      { label: 'Favoris', value: String(me.stats.favoritesCount) },
    ],
    collections: [],
    activity: [],
  }
})
</script>
