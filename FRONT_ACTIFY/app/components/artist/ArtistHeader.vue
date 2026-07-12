<template>
  <section class="surface relative overflow-hidden min-h-[320px] mb-[18px]">
    <img class="absolute inset-0 w-full h-full object-cover brightness-[0.42]" :src="artist.cover" :alt="artist.displayName" >
    <div
      class="absolute inset-0"
      style="background: linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.74))"
    />

    <div class="relative z-10 pt-7 px-6 pb-[18px] flex flex-col justify-end min-h-[320px]">
      <div class="flex items-end gap-4 max-sm:flex-col max-sm:items-start">
        <img
          class="w-[92px] h-[92px] rounded-full object-cover border-2 border-white/18"
          :src="artist.avatar"
          :alt="artist.displayName"
        >
        <div>
          <h1 class="ethnocentric m-0 text-[clamp(28px,4vw,44px)]">{{ artist.displayName }}</h1>
          <div class="flex gap-2.5 flex-wrap mt-2.5">
            <span class="pill-badge">{{ artist.joinedAt }}</span>
            <span class="pill-badge">{{ artist.wallet }}</span>
          </div>
        </div>
      </div>

      <nav class="flex gap-[18px] mt-[26px] max-sm:flex-wrap" aria-label="Navigation artiste">
        <NuxtLink
          :to="`/artist/${artist.slug}/collections`"
          class="pb-2.5 border-b-3 border-transparent text-muted no-underline"
          :class="{ '!text-foreground !border-white': activeTab === 'collections' }"
        >
          Collections
        </NuxtLink>
        <NuxtLink
          :to="`/artist/${artist.slug}/items`"
          class="pb-2.5 border-b-3 border-transparent text-muted no-underline"
          :class="{ '!text-foreground !border-white': activeTab === 'items' }"
        >
          Items
        </NuxtLink>
        <span class="pb-2.5 border-b-3 border-transparent text-muted cursor-default">Listed</span>
        <span class="pb-2.5 border-b-3 border-transparent text-muted cursor-default">Activity</span>
      </nav>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ArtistIdentity } from '~/types/marketplace'

defineProps<{
  artist: ArtistIdentity
  activeTab: 'collections' | 'items'
}>()
</script>
