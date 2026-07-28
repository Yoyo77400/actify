<template>
  <div v-if="collection" class="flex flex-col gap-7">
    <!-- Cover + title, same visual language as the profile header. -->
    <section class="surface relative overflow-hidden min-h-[220px]">
      <img class="absolute inset-0 w-full h-full object-cover brightness-[0.42]" :src="cover" :alt="collection.name">
      <div
        class="absolute inset-0"
        style="background: linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.74))"
      />
      <div class="relative z-10 p-6 flex flex-col justify-end min-h-[220px]">
        <NuxtLink to="/collections" class="text-muted text-xs hover:text-foreground w-fit flex items-center gap-1.5">
          <Icon name="ph:arrow-left" class="text-sm" />
          Toutes les collections
        </NuxtLink>
        <h1 class="ethnocentric m-0 mt-3 text-[clamp(22px,3.2vw,34px)]">{{ collection.name }}</h1>
        <div class="flex gap-2.5 flex-wrap mt-2.5">
          <span class="pill-badge">
            {{ collection.listingCount }} {{ collection.listingCount > 1 ? 'assets' : 'asset' }}
          </span>
        </div>
      </div>
    </section>

    <section>
      <CommonSectionHeader title="Assets de la collection" subtitle="Les licences publiées dans cette collection" />

      <p v-if="assetsError" class="surface p-8 text-center text-danger text-sm" role="alert">
        Impossible de charger les assets de cette collection.
      </p>
      <div v-else-if="assets.length" class="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-4">
        <!-- Le propriétaire voit aussi ses brouillons : sans le badge, un asset
             rangé mais non publié semblerait déjà visible du public. -->
        <div v-for="item in assets" :key="item.id" class="relative">
          <span
            v-if="item.status && item.status !== 'Published'"
            class="pill-badge absolute top-3 left-3 z-10 bg-panel-3/90"
          >{{ item.status === 'Draft' ? 'Brouillon' : item.status }}</span>
          <ArtistAssetCard :item="item" />
        </div>
      </div>
      <div v-else class="surface p-8 text-center">
        <p class="text-muted text-sm">Aucun asset publié dans cette collection.</p>
        <p v-if="collection.isOwner" class="text-muted-2 text-xs mt-1">
          Vos brouillons rangés ici apparaîtraient dans cette liste.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const collections = useCollections()
const slug = computed(() => String(route.params.slug))

const { data: collection } = await useAsyncData(
  () => `collection-${slug.value}`,
  async () => {
    try {
      return await collections.get(slug.value)
    } catch (err) {
      // Swallowed here on purpose: useAsyncData captures whatever this throws
      // into its `error` ref, which would render an empty page with a 200.
      // The real 404 is raised below, at setup level, where it sets the status.
      if (toApiError(err)?.code === 'NOT_FOUND') return null
      throw err
    }
  },
)

if (!collection.value) {
  throw createError({ statusCode: 404, statusMessage: 'Collection introuvable', fatal: true })
}

const { data: assetsData, error: assetsError } = await useAsyncData(
  () => `collection-assets-${slug.value}`,
  () => collections.assets(slug.value),
)
const assets = computed(() => assetsData.value ?? [])

const cover = computed(() =>
  collection.value?.img ?? bannerImage(null, collection.value?.slug ?? 'collection'),
)

useHead(() => ({ title: collection.value?.name ?? 'Collection' }))
</script>
