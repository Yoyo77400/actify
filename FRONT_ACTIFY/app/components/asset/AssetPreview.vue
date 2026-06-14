<template>
  <section class="surface overflow-hidden min-h-[520px] grid place-items-center bg-[#20242c]">
    <img class="w-full max-h-[520px] object-contain bg-[#f3f5f9]" :src="asset.image" :alt="asset.name" />
  </section>
</template>

<script setup lang="ts">
import type { ArtistAsset } from '~/types/marketplace'

defineProps<{
  asset: ArtistAsset
}>()
</script>
