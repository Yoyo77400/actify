<template>
  <aside class="surface overflow-hidden min-h-[280px]">
    <div
      class="min-h-[340px] grid place-items-center text-white/92 text-[clamp(42px,5vw,74px)] font-light tracking-[0.08em]"
      style="background: linear-gradient(180deg, #7d7d7d 0%, #9d9d9d 100%); writing-mode: vertical-rl; transform: rotate(180deg)"
    >
      FILTRES
    </div>
    <div class="p-3.5">
      <p class="m-0 text-muted text-[13px]">{{ artist.bio }}</p>
      <p class="mt-2.5 mb-0 text-muted text-[13px]">{{ artist.followersLabel }}</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ArtistIdentity } from '~/types/marketplace'

defineProps<{
  artist: ArtistIdentity
}>()
</script>
