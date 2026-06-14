<template>
  <div class="flex flex-col gap-7">
    <HomeCategoryFilters :categories="payload.categories" :chains="payload.chains" />

    <section class="grid grid-cols-[minmax(0,1fr)_300px] max-xl:grid-cols-1 gap-[18px]">
      <HomeHeroCarousel :slides="payload.hero" />
      <HomeTopSellersPanel :sellers="payload.topSellers" />
    </section>

    <section>
      <CommonSectionHeader title="Trending Tokens" subtitle="Tokens with momentum today" />
      <HomeTokenGrid :items="payload.trendingTokens" />
    </section>

    <section>
      <CommonSectionHeader title="Featured Collections" subtitle="This week's curated collections" />
      <div class="grid grid-cols-3 max-xl:grid-cols-2 max-md:grid-cols-1 gap-4">
        <HomeCollectionCard
          v-for="item in payload.featuredCollections"
          :key="item.id"
          :item="item"
        />
      </div>
    </section>

    <section>
      <CommonSectionHeader title="Trending Collections" subtitle="Highest bids in the past hour" />
      <HomeCollectionStrip :items="payload.trendingCollections" />
    </section>

    <section>
      <CommonSectionHeader title="Featured Drops" subtitle="This week's curated live and upcoming drops" />
      <div class="grid grid-cols-3 max-xl:grid-cols-2 max-md:grid-cols-1 gap-4">
        <HomeDropCard
          v-for="item in payload.featuredDrops"
          :key="item.id"
          :item="item"
        />
      </div>
    </section>

    <section>
      <CommonSectionHeader title="Top Movers Today" subtitle="Largest floor price change in the past day" />
      <div class="grid grid-cols-3 max-xl:grid-cols-2 max-md:grid-cols-1 gap-4">
        <HomeCollectionCard
          v-for="item in payload.topMovers"
          :key="item.id"
          :item="item"
        />
      </div>
    </section>

    <section>
      <CommonSectionHeader title="Highest Weekly Sales" />
      <HomeWeeklyShowcase :payload="payload.weeklyShowcase" />
    </section>

    <section>
      <CommonSectionHeader title="Featured Tokens" subtitle="This week's curated tokens" />
      <div class="grid grid-cols-3 max-xl:grid-cols-2 max-md:grid-cols-1 gap-4">
        <HomeCollectionCard
          v-for="item in payload.featuredTokens"
          :key="item.id"
          :item="item"
        />
      </div>
    </section>

    <section>
      <CommonSectionHeader title="NFT 101" subtitle="Learn about NFTs, wallets and minting" />
      <div class="grid grid-cols-3 max-xl:grid-cols-2 max-md:grid-cols-1 gap-4">
        <HomeEducationCard
          v-for="item in payload.nft101"
          :key="item.id"
          :item="item"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { data } = await useHomeData()
const payload = computed(() => data.value)

useHead({
  title: 'Accueil',
  meta: [
    {
      name: 'description',
      content: 'Marketplace digitale construite en Nuxt avec composants, layouts, composables et Pinia.'
    }
  ]
})
</script>
