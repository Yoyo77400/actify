<template>
  <section class="surface relative overflow-hidden min-h-[280px]">
    <img
      class="absolute inset-0 w-full h-full object-cover brightness-[0.42]"
      :src="user.cover"
      :alt="user.displayName"
    >
    <div
      class="absolute inset-0"
      style="background: linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.74))"
    />

    <div class="relative z-10 pt-7 px-6 pb-[18px] flex flex-col justify-end min-h-[280px]">
      <div class="flex items-end gap-4 max-sm:flex-col max-sm:items-start">
        <img
          class="w-[92px] h-[92px] rounded-full object-cover border-2 border-white/18"
          :src="user.avatar"
          :alt="user.displayName"
        >
        <div class="flex-1 min-w-0">
          <h1 class="ethnocentric m-0 text-[clamp(24px,3.5vw,38px)]">{{ user.displayName }}</h1>
          <p class="m-0 mt-1 text-muted text-sm">{{ user.username }}</p>
          <div class="flex gap-2.5 flex-wrap mt-2.5">
            <span class="pill-badge">Joined {{ user.joinedAt }}</span>
            <span class="pill-badge">{{ user.followersCount.toLocaleString() }} followers</span>
            <span class="pill-badge">{{ user.followingCount }} following</span>
          </div>
        </div>
        <button class="secondary-btn flex items-center gap-2 shrink-0 text-sm font-medium" type="button">
          <Icon name="ph:pencil-simple" class="text-base" />
          Edit profile
        </button>
      </div>

      <p v-if="user.bio" class="mt-4 mb-0 text-white/70 text-sm leading-relaxed max-w-[600px]">
        {{ user.bio }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { UserProfile } from '~/types/profile'

defineProps<{ user: UserProfile }>()
</script>