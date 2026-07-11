<template>
  <section class="surface p-[18px]">
    <header class="flex items-start justify-between gap-3">
      <div>
        <h1 class="ethnocentric m-0 text-[clamp(26px,3.4vw,40px)]">{{ asset.name }}</h1>
        <p class="mt-2.5 mb-0 text-muted text-[13px]">
          {{ asset.creator }}
          <span v-if="creatorVerified" class="text-verified">✔</span>
          · Contract: {{ asset.contract }}
        </p>
      </div>
      <button class="ghost-btn" type="button" @click="ui.toggleFavorite(asset.id)">
        {{ isFavorite ? '♥' : '♡' }}
      </button>
    </header>

    <div class="surface--soft mt-[18px] p-3.5 grid grid-cols-4 max-md:grid-cols-2 gap-3">
      <article>
        <span class="block text-muted text-xs uppercase tracking-[0.08em]">Sells</span>
        <strong class="block mt-1.5">{{ asset.salesCount }} units</strong>
      </article>
      <article>
        <span class="block text-muted text-xs uppercase tracking-[0.08em]">Popularity</span>
        <strong class="block mt-1.5">{{ stars }}</strong>
      </article>
      <article>
        <span class="block text-muted text-xs uppercase tracking-[0.08em]">Chain</span>
        <strong class="block mt-1.5">{{ asset.chain }}</strong>
      </article>
      <article>
        <span class="block text-muted text-xs uppercase tracking-[0.08em]">Last sale</span>
        <strong class="block mt-1.5">{{ asset.lastSaleLabel }}</strong>
      </article>
    </div>

    <div class="mt-[18px]">
      <span class="text-[28px] font-bold mr-2.5">{{ asset.price }} {{ asset.chain }}</span>
      <span class="pill-badge">Licence type</span>
    </div>

    <div class="surface--soft mt-[18px] p-3 grid grid-cols-[1fr_180px] max-md:grid-cols-1 gap-3">
      <input class="input" type="text" placeholder="Choose your amount" >
      <button class="primary-btn">Buy</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ArtistAsset } from '~/types/marketplace'

const props = defineProps<{
  asset: ArtistAsset
  creatorVerified?: boolean
}>()

const ui = useMarketplaceUiStore()
const isFavorite = computed(() => ui.favorites.includes(props.asset.id))
const stars = computed(() => '★'.repeat(props.asset.popularity) + '☆'.repeat(5 - props.asset.popularity))
</script>
