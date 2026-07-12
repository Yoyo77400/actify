<template>
  <aside>
    <div class="flex justify-end mb-3">
      <div class="surface--soft inline-flex gap-1 p-1">
        <button class="min-h-8 px-2.5 rounded-lg border-0 bg-panel-3 text-foreground" type="button">NFTs</button>
        <button class="min-h-8 px-2.5 rounded-lg border-0 bg-transparent text-muted" type="button">Tokens</button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <article
        v-for="seller in sellers"
        :key="seller.id"
        class="flex items-center justify-between gap-3 pb-2.5 border-b border-line"
      >
        <div class="flex items-center gap-2.5">
          <img class="w-9 h-9 rounded-[10px] object-cover" :src="seller.image" :alt="seller.name" >
          <div>
            <h3 class="ethnocentric m-0 text-sm">
              {{ seller.name }}
              <span v-if="seller.verified" class="text-verified text-[0.85em]">✔</span>
            </h3>
          </div>
        </div>

        <div class="text-right flex flex-col gap-1">
          <strong class="m-0 text-sm">{{ seller.floorPrice }} {{ seller.currency }}</strong>
          <span class="text-xs font-bold" :class="seller.change >= 0 ? 'text-success' : 'text-danger'">
            {{ seller.change >= 0 ? '+' : '' }}{{ seller.change }}%
          </span>
        </div>
      </article>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { SellerRow } from '~/types/marketplace'

defineProps<{
  sellers: SellerRow[]
}>()
</script>
