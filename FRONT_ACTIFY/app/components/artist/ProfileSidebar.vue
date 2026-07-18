<template>
  <aside class="surface p-4 flex flex-col gap-4 h-fit">
    <div>
      <p class="m-0 text-muted text-xs uppercase tracking-wider">À propos</p>
      <p class="mt-2 mb-0 text-muted text-[13px] leading-relaxed">
        {{ artist.bio ?? 'Cet artiste n\'a pas encore de bio.' }}
      </p>
    </div>

    <div class="border-t border-line pt-3 flex flex-col gap-2">
      <div class="flex items-center justify-between text-[13px]">
        <span class="text-muted">Assets publiés</span>
        <span class="text-foreground font-medium">{{ artist.stats.listingsCount }}</span>
      </div>
      <div class="flex items-center justify-between text-[13px]">
        <span class="text-muted">Avis rédigés</span>
        <span class="text-foreground font-medium">{{ artist.stats.reviewsCount }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { PublicProfile } from '~/types/marketplace'

defineProps<{
  artist: PublicProfile
}>()
</script>
