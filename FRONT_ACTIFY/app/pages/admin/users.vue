<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
      <div>
        <h1 class="ethnocentric m-0 text-2xl">Users</h1>
        <p class="mt-1 mb-0 text-muted text-sm">{{ total }} registered users</p>
      </div>
      <AdminSearchBar v-model="store.search" placeholder="Search users..." />
    </div>

    <div class="flex gap-2 scroll-x">
      <button
        v-for="f in filters"
        :key="f.value"
        class="chip shrink-0"
        :class="{ 'chip--active': store.userFilter === f.value }"
        type="button"
        @click="store.userFilter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <div class="surface overflow-hidden">
      <AdminUserRow
        v-for="user in filtered"
        :key="user.id"
        :user="user"
        @suspend="onSuspend"
        @ban="onBan"
        @reactivate="onReactivate"
      />
      <AdminEmptyState v-if="!filtered.length" message="No users match your filters" icon="ph:users" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { adminSuspendUser, adminBanUser, adminReactivateUser } from '~/composables/useAdminApi'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Users' })

const store = useAdminStore()
const { data } = await useAdminUsers()
const total = computed(() => data.value.total)
const filtered = computed(() => store.filterUsers(data.value.users))

const filters = [
  { label: 'All', value: 'all' as const },
  { label: 'Active', value: 'active' as const },
  { label: 'Suspended', value: 'suspended' as const },
  { label: 'Banned', value: 'banned' as const },
]

function onSuspend(id: string) {
  store.requestConfirm('Suspend this user? They won\'t be able to list or sell until reactivated.', () => adminSuspendUser(id))
}
function onBan(id: string) {
  store.requestConfirm('Ban this user permanently? All their listings will be removed.', () => adminBanUser(id))
}
function onReactivate(id: string) {
  store.requestConfirm('Reactivate this user? They will regain full access.', () => adminReactivateUser(id))
}
</script>