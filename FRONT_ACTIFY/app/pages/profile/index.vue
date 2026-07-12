<template>
  <div v-if="view" class="flex flex-col gap-7">
    <ProfileHeader :user="view" />

    <div class="grid grid-cols-[1fr_300px] max-xl:grid-cols-1 gap-[18px]">
      <div class="flex flex-col gap-7">
        <section>
          <CommonSectionHeader title="My Collections" subtitle="Your created and owned collections" />
          <div v-if="view.collections.length" class="grid grid-cols-2 max-md:grid-cols-1 gap-4">
            <ProfileCollectionCard
              v-for="col in view.collections"
              :key="col.id"
              :collection="col"
            />
          </div>
          <div v-else class="surface p-8 text-center">
            <p class="text-muted text-sm">Aucune collection pour le moment.</p>
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
    avatar: me.avatarCid
      ? `https://ipfs.io/ipfs/${me.avatarCid}`
      : `https://picsum.photos/seed/${me.id}/200/200`,
    cover: 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1800&q=80',
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
