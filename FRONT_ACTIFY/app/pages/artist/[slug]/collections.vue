<template>
  <div class="flex flex-col gap-7">
    <ArtistHeader :artist="payload.artist" active-tab="collections" />

    <section class="grid grid-cols-[250px_minmax(0,1fr)] max-lg:grid-cols-1 gap-[18px]">
      <ArtistProfileSidebar :artist="payload.artist" />

      <div>
        <CommonSectionHeader title="Collections" :subtitle="`${payload.collections.length} results`" />
        <div class="grid grid-cols-2 max-md:grid-cols-1 gap-4">
          <ArtistCollectionCardLarge
            v-for="collection in payload.collections"
            :key="collection.id"
            :item="collection"
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
  title: `Artiste ${payload.value.artist.displayName} · Collections`,
  meta: [{ name: 'description', content: `Collections de ${payload.value.artist.displayName}` }]
})
</script>
