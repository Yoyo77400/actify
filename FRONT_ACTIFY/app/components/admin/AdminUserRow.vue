<template>
  <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-line last:border-b-0">
    <div class="flex items-center gap-3 min-w-0">
      <img v-if="avatarUrl" class="w-9 h-9 rounded-full object-cover shrink-0" :src="avatarUrl" :alt="name" >
      <!-- No avatar uploaded — neutral local tile, no third-party placeholder service. -->
      <div v-else class="w-9 h-9 rounded-full bg-panel-3 border border-line grid place-items-center shrink-0">
        <Icon name="ph:user" class="text-muted" />
      </div>
      <div class="min-w-0">
        <p class="m-0 text-sm font-medium truncate">
          {{ name }}
          <span v-if="user.username" class="text-muted text-xs ml-1">@{{ user.username }}</span>
        </p>
        <p class="m-0 text-xs text-muted-2 mt-0.5">
          {{ user.email ?? 'Email non renseigné' }} · inscrit le {{ joinedLabel }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-3 shrink-0">
      <span class="pill-badge text-xs" :class="roleBadge">{{ user.role }}</span>
      <span class="pill-badge text-xs" :class="statusBadge">{{ statusLabel }}</span>

      <!-- No actions on a soft-deleted account (mirror of AdminAssetRow). -->
      <div v-if="!user.deletedAt" class="relative">
        <button
          class="ghost-btn w-8 h-8 !p-0 flex items-center justify-center"
          type="button"
          aria-label="Actions utilisateur"
          @click="menuOpen = !menuOpen"
        >
          <Icon name="ph:dots-three-vertical" />
        </button>
        <div v-if="menuOpen" class="admin-dropdown" @mouseleave="menuOpen = false">
          <button
            v-if="user.isBanned"
            class="admin-dropdown-item text-success"
            type="button"
            @click="emit('unban', user.id); menuOpen = false"
          >
            Débannir
          </button>
          <!-- The API refuses to ban an admin (403) — mirror the rule in the UI. -->
          <button
            v-else-if="user.role !== 'admin'"
            class="admin-dropdown-item text-danger"
            type="button"
            @click="emit('ban', user.id); menuOpen = false"
          >
            Bannir
          </button>
          <button
            v-if="user.role === 'admin'"
            class="admin-dropdown-item"
            type="button"
            @click="emit('demote', user.id); menuOpen = false"
          >
            Rétrograder en utilisateur
          </button>
          <button
            v-else
            class="admin-dropdown-item"
            type="button"
            @click="emit('promote', user.id); menuOpen = false"
          >
            Promouvoir admin
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
  ban: [id: string]
  unban: [id: string]
  promote: [id: string]
  demote: [id: string]
}>()

const menuOpen = ref(false)

// Soft-deleted accounts are scrubbed of all PII (username/email/displayName null).
const name = computed(() =>
  props.user.displayName
  ?? props.user.username
  ?? (props.user.deletedAt ? 'Compte supprimé' : 'Sans nom'),
)

// Avatar served by our own API — no third-party gateway (privacy policy).
const avatarUrl = computed(() => fileUrl(props.user.avatarCid))

// Pinned timezone: SSR-rendered, keep server and client output identical.
const joinedLabel = computed(() =>
  new Date(props.user.createdAt).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }),
)

const roleBadge = computed(() => ({
  'bg-accent/12 text-accent border-accent/20': props.user.role === 'admin',
}))

const statusLabel = computed(() =>
  props.user.deletedAt ? 'Supprimé' : props.user.isBanned ? 'Banni' : 'Actif',
)

const statusBadge = computed(() => ({
  'bg-success/12 text-success border-success/20': !props.user.deletedAt && !props.user.isBanned,
  'bg-danger/12 text-danger border-danger/20': Boolean(props.user.deletedAt) || props.user.isBanned,
}))
</script>
