<template>
  <div class="flex flex-col gap-7">
    <ArtistHeader :artist="payload.artist" active-tab="items" />

    <section class="grid grid-cols-[250px_minmax(0,1fr)] max-lg:grid-cols-1 gap-[18px]">
      <ArtistProfileSidebar :artist="payload.artist" />

      <div>
        <CommonSectionHeader title="Items" :subtitle="`${payload.items.length} results`" />
        <div class="surface--soft grid grid-cols-[54px_minmax(0,380px)] max-lg:grid-cols-[54px_1fr] gap-3 p-3 mb-4">
          <button class="ghost-btn" type="button">«</button>
          <input class="input" type="search" placeholder="Search" >
        </div>

        <div class="grid grid-cols-3 max-xl:grid-cols-2 max-md:grid-cols-1 gap-4 items-start">
          <ArtistAssetCard
            v-for="item in payload.items"
            :key="item.id"
            :item="item"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { data } = await useArtistData(slug.value)
const payload = computed(() => data.value)

useHead({
  title: `Artiste ${payload.value.artist.displayName} · Items`,
  meta: [{ name: 'description', content: `Items de ${payload.value.artist.displayName}` }]
})
</script>
