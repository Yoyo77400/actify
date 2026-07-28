<template>
  <div class="surface p-4 flex items-center gap-3">
    <NuxtLink
      v-if="creator.username"
      :to="`/artist/${creator.username}/items`"
      class="flex items-center gap-3 flex-1 min-w-0"
    >
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        class="w-12 h-12 rounded-full object-cover shrink-0"
        :alt="name"
      >
      <div v-else class="w-12 h-12 rounded-full bg-panel-3 border border-line grid place-items-center shrink-0">
        <Icon name="ph:user" class="text-muted" />
      </div>
      <div class="min-w-0">
        <p class="m-0 text-sm font-medium truncate">{{ name }}</p>
        <p class="m-0 text-xs text-muted-2">
          {{ creator.listingsCount }} asset{{ creator.listingsCount > 1 ? 's' : '' }}
          · {{ creator.followersCount }} abonné{{ creator.followersCount > 1 ? 's' : '' }}
        </p>
      </div>
    </NuxtLink>

    <button
      v-if="canFollow"
      type="button"
      class="text-xs px-3 shrink-0"
      :class="creator.isFollowing ? 'ghost-btn' : 'primary-btn'"
      :disabled="toggling"
      @click="emit('toggle')"
    >
      {{ creator.isFollowing ? 'Suivi ✓' : 'Suivre' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { CreatorCard } from '~/types/marketplace'

const props = defineProps<{
  creator: CreatorCard
  canFollow: boolean
  toggling: boolean
}>()
const emit = defineEmits<{ toggle: [] }>()

const name = computed(() => props.creator.displayName ?? props.creator.username ?? 'Artiste')
const avatarUrl = computed(() => fileUrl(props.creator.avatarCid))
</script>
