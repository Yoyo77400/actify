<template>
  <div class="flex flex-col gap-7">
    <div>
      <h1 class="ethnocentric m-0 text-2xl">Tableau de bord</h1>
      <p class="mt-1 mb-0 text-muted text-sm">Vue d'ensemble de l'activité de la plateforme</p>
    </div>

    <div v-if="loadError" class="surface p-10 flex flex-col items-center gap-3 text-center">
      <Icon name="ph:warning-circle" class="text-3xl text-danger" />
      <p class="m-0 text-muted text-sm" role="alert">{{ loadError }}</p>
      <button type="button" class="primary-btn mt-2" @click="refresh()">Réessayer</button>
    </div>

    <template v-else-if="stats">
      <div class="grid grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
        <AdminStatCard label="Utilisateurs" :value="stats.totalUsers.toLocaleString('fr-FR')" />
        <AdminStatCard label="Utilisateurs bannis" :value="stats.bannedUsers.toLocaleString('fr-FR')" />
        <AdminStatCard label="Assets" :value="stats.totalAssets.toLocaleString('fr-FR')" />
        <AdminStatCard label="Commandes" :value="stats.totalOrders.toLocaleString('fr-FR')" />
        <AdminStatCard label="Revenu confirmé" :value="stats.confirmedRevenue.toLocaleString('fr-FR')" />
      </div>

      <section>
        <h2 class="ethnocentric m-0 text-lg mb-3">Assets par statut</h2>
        <div class="grid grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
          <AdminStatCard label="Publiés" :value="stats.byStatus.Published ?? 0" />
          <AdminStatCard label="Brouillons" :value="stats.byStatus.Draft ?? 0" />
          <AdminStatCard label="Suspendus" :value="stats.byStatus.Suspended ?? 0" />
          <AdminStatCard label="Archivés" :value="stats.byStatus.Archived ?? 0" />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AdminStats } from '~/types/admin'

type StatsResult =
  | { ok: true; stats: AdminStats }
  | { ok: false; message: string }

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Tableau de bord' })

const adminApi = useAdminApi()

// Errors are normalized inside the handler so `toApiError` sees the raw
// FetchError (Nuxt would otherwise wrap it and break `instanceof`).
const { data, refresh } = await useAsyncData<StatsResult>('admin-stats', async () => {
  try {
    return { ok: true, stats: await adminApi.stats() }
  } catch (err) {
    return {
      ok: false,
      message: toApiError(err)?.message
        ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Impossible de charger les statistiques.'),
    }
  }
})

const stats = computed<AdminStats | null>(() => {
  const d = data.value
  return d?.ok ? d.stats : null
})
const loadError = computed<string | null>(() => {
  const d = data.value
  return d && !d.ok ? d.message : null
})
</script>
