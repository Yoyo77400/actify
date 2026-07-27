<template>
  <div v-if="view" class="flex flex-col gap-7">
    <ProfileHeader :user="view" @edit="editing = true" />
    <ProfileEditModal v-model="editing" />

    <div class="grid grid-cols-[1fr_300px] max-xl:grid-cols-1 gap-[18px]">
      <div class="flex flex-col gap-7">
        <ProfileCollections />

        <section>
          <CommonSectionHeader title="Mes assets" subtitle="Vos créations publiées et vos brouillons" />

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
              <ArtistAssetCard :item="item" />
            </div>
          </div>
          <div v-else class="surface p-8 text-center">
            <p class="text-muted text-sm">Aucun asset pour le moment.</p>
            <NuxtLink to="/asset/new" class="text-accent text-sm hover:underline">Publier un premier asset</NuxtLink>
          </div>
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
import type { UserProfile } from '~/types/profile'

definePageMeta({ middleware: 'auth' })

useHead({ title: 'Mon profil' })

const { user } = useAuth()
const assets = useAssets()

const editing = ref(false)

// The owner's own listings — /creator/listings is scoped server-side to the
// caller (sellerId) and, unlike the public catalogue, includes drafts.
// Refetched after an edit so a freshly published asset shows up.
const { data: listingsData, error: listingsError, refresh: refreshListings } = await useAsyncData(
  'profile-listings',
  () => assets.myListings(),
)
const listings = computed(() => listingsData.value ?? [])

watch(editing, (open) => {
  if (!open) refreshListings()
})

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

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
    cover: bannerImage(me.bannerCid, me.id),
    bio: me.bio ?? '',
    joinedAt: new Date(me.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
    followersCount: 0,
    followingCount: 0,
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
