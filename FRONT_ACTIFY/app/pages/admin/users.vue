<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
      <div>
        <h1 class="ethnocentric m-0 text-2xl">Utilisateurs</h1>
        <p class="mt-1 mb-0 text-muted text-sm">{{ meta?.total ?? 0 }} utilisateur{{ (meta?.total ?? 0) > 1 ? 's' : '' }} inscrit{{ (meta?.total ?? 0) > 1 ? 's' : '' }}</p>
      </div>
      <AdminSearchBar v-model="q" placeholder="Rechercher (username, email)..." />
    </div>

    <div class="flex gap-2 scroll-x">
      <button
        v-for="f in filters"
        :key="f.value"
        class="chip shrink-0"
        :class="{ 'chip--active': filter === f.value }"
        type="button"
        @click="filter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <p v-if="errorMsg" class="surface p-4 text-danger text-sm" role="alert">{{ errorMsg }}</p>

    <div class="surface overflow-hidden">
      <AdminUserRow
        v-for="user in users"
        :key="user.id"
        :user="user"
        @ban="onBan"
        @unban="onUnban"
        @promote="onPromote"
        @demote="onDemote"
      />
      <AdminEmptyState
        v-if="!users.length && !loading && !errorMsg"
        message="Aucun utilisateur ne correspond aux filtres"
        icon="ph:users"
      />
    </div>

    <div v-if="loading" class="flex justify-center py-4">
      <span class="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>

    <div v-if="meta && meta.totalPages > 1" class="flex items-center justify-center gap-3 pt-2">
      <button type="button" class="ghost-btn text-sm" :disabled="page <= 1 || loading" @click="goToPage(page - 1)">
        Précédent
      </button>
      <span class="text-muted text-sm">Page {{ meta.page }} / {{ meta.totalPages }}</span>
      <button
        type="button"
        class="ghost-btn text-sm"
        :disabled="page >= meta.totalPages || loading"
        @click="goToPage(page + 1)"
      >
        Suivant
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminUser, PageMeta } from '~/types/admin'
import type { AdminUserListParams } from '~/composables/useAdminApi'

type UserFilter = 'all' | 'active' | 'banned' | 'admin'

const PAGE_SIZE = 20

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Utilisateurs' })

const adminApi = useAdminApi()
const store = useAdminStore()

const q = ref('')
const filter = ref<UserFilter>('all')
const page = ref(1)

const users = ref<AdminUser[]>([])
const meta = ref<PageMeta | null>(null)
const loading = ref(false)
const errorMsg = ref<string | null>(null)

// Maps the UI filter to the real query params (banned + role, see admin.controller).
const filters: Array<{ label: string; value: UserFilter }> = [
  { label: 'Tous', value: 'all' },
  { label: 'Actifs', value: 'active' },
  { label: 'Bannis', value: 'banned' },
  { label: 'Admins', value: 'admin' },
]

function buildParams(): AdminUserListParams {
  return {
    q: q.value || undefined,
    banned: filter.value === 'active' ? false : filter.value === 'banned' ? true : undefined,
    role: filter.value === 'admin' ? 'admin' : undefined,
    page: page.value,
    limit: PAGE_SIZE,
  }
}

// Monotonic token: a slow response resolving after a filter change is discarded
// instead of clobbering the fresher list (same pattern as pages/assets/index.vue).
let requestSeq = 0

async function fetchUsers() {
  const seq = ++requestSeq
  loading.value = true
  errorMsg.value = null
  try {
    const result = await adminApi.listUsers(buildParams())
    if (seq !== requestSeq) return
    // A mutation can empty the last page (page index now past totalPages):
    // clamp and refetch instead of showing a fake "no results" state. The
    // recursive call bumps requestSeq, so this stale response is discarded and
    // the inner fetch takes over the loading flag.
    const lastPage = Math.max(1, result.meta.totalPages)
    if (!result.items.length && lastPage < page.value) {
      page.value = lastPage
      fetchUsers()
      return
    }
    users.value = result.items
    meta.value = result.meta
  } catch (err) {
    if (seq !== requestSeq) return
    errorMsg.value = toApiError(err)?.message
      ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Impossible de charger les utilisateurs.')
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

// First page runs during SSR; errors normalized in the handler for toApiError.
const { data: first } = await useAsyncData('admin-users', async () => {
  try {
    return { ok: true as const, ...(await adminApi.listUsers(buildParams())) }
  } catch (err) {
    return {
      ok: false as const,
      message: toApiError(err)?.message
        ?? (isNetworkError(err) ? 'Connexion au serveur impossible.' : 'Impossible de charger les utilisateurs.'),
    }
  }
})
if (first.value?.ok) {
  users.value = first.value.items
  meta.value = first.value.meta
} else if (first.value) {
  errorMsg.value = first.value.message
}

// Debounce keystrokes so typing doesn't fire one request per character.
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(q, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    fetchUsers()
  }, 300)
})

watch(filter, () => {
  page.value = 1
  fetchUsers()
})

function goToPage(target: number) {
  page.value = target
  fetchUsers()
}

// Confirmed actions handle their own errors so the modal always closes.
async function run(action: () => Promise<unknown>) {
  try {
    await action()
    await fetchUsers()
  } catch (err) {
    errorMsg.value = toApiError(err)?.message ?? "L'action a échoué."
  }
}

function onBan(id: string) {
  store.requestConfirm('Bannir cet utilisateur ?', () => run(() => adminApi.banUser(id)))
}
function onUnban(id: string) {
  store.requestConfirm('Débannir cet utilisateur ?', () => run(() => adminApi.unbanUser(id)))
}
function onPromote(id: string) {
  store.requestConfirm('Donner le rôle admin à cet utilisateur ?', () => run(() => adminApi.updateUserRole(id, 'admin')))
}
function onDemote(id: string) {
  store.requestConfirm('Rétrograder cet administrateur en utilisateur ?', () => run(() => adminApi.updateUserRole(id, 'user')))
}
</script>
