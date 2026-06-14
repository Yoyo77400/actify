<template>
  <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-line last:border-b-0">
    <div class="flex items-center gap-3 min-w-0">
      <img class="w-9 h-9 rounded-full object-cover shrink-0" :src="user.avatar" :alt="user.displayName" />
      <div class="min-w-0">
        <p class="m-0 text-sm font-medium truncate">
          {{ user.displayName }}
          <span class="text-muted text-xs ml-1">{{ user.username }}</span>
        </p>
        <p class="m-0 text-xs text-muted-2 mt-0.5">{{ user.email }} · {{ user.wallet }}</p>
      </div>
    </div>

    <div class="flex items-center gap-3 shrink-0">
      <span class="pill-badge text-xs" :class="roleBadge">{{ user.role }}</span>
      <span class="pill-badge text-xs" :class="statusBadge">{{ user.status }}</span>
      <span class="text-xs text-muted hidden lg:block w-[80px] text-right">{{ user.totalVolume }}</span>

      <div class="relative">
        <button
          class="ghost-btn w-8 h-8 !p-0 flex items-center justify-center"
          type="button"
          @click="menuOpen = !menuOpen"
        >
          <Icon name="ph:dots-three-vertical" />
        </button>
        <div v-if="menuOpen" class="admin-dropdown" @mouseleave="menuOpen = false">
          <button
            v-if="user.status !== 'suspended'"
            class="admin-dropdown-item"
            type="button"
            @click="emit('suspend', user.id); menuOpen = false"
          >
            Suspend
          </button>
          <button
            v-if="user.status !== 'banned'"
            class="admin-dropdown-item text-danger"
            type="button"
            @click="emit('ban', user.id); menuOpen = false"
          >
            Ban
          </button>
          <button
            v-if="user.status !== 'active'"
            class="admin-dropdown-item text-success"
            type="button"
            @click="emit('reactivate', user.id); menuOpen = false"
          >
            Reactivate
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminUser } from '~/types/admin'

const props = defineProps<{ user: AdminUser }>()
const emit = defineEmits<{
  suspend: [id: string]
  ban: [id: string]
  reactivate: [id: string]
}>()

const menuOpen = ref(false)

const roleBadge = computed(() => ({
  'bg-accent/12 text-accent border-accent/20': props.user.role === 'admin',
  'bg-warning/12 text-warning border-warning/20': props.user.role === 'moderator',
  'bg-success/12 text-success border-success/20': props.user.role === 'artist',
}))

const statusBadge = computed(() => ({
  'bg-success/12 text-success border-success/20': props.user.status === 'active',
  'bg-warning/12 text-warning border-warning/20': props.user.status === 'suspended',
  'bg-danger/12 text-danger border-danger/20': props.user.status === 'banned',
}))
</script>