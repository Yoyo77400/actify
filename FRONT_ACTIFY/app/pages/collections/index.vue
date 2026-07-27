<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1">
      <h1 class="ethnocentric text-foreground text-2xl">Collections</h1>
      <p class="text-muted text-sm">Les regroupements d'assets publiés sur Actify.</p>
    </div>

    <p v-if="error" class="surface p-8 text-center text-danger text-sm" role="alert">
      Impossible de charger les collections.
    </p>
    <div v-else-if="collections.length" class="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-4">
      <NuxtLink
        v-for="col in collections"
        :key="col.id"
        :to="`/collections/${col.slug}`"
        class="surface overflow-hidden"
      >
        <img
          :src="col.img ?? bannerImage(null, col.slug)"
          :alt="col.name"
          class="w-full h-[160px] object-cover bg-panel-3"
          loading="lazy"
        >
        <div class="p-3.5">
          <h2 class="ethnocentric m-0 text-base line-clamp-1">{{ col.name }}</h2>
          <p class="mt-1.5 mb-0 text-muted text-xs">
            {{ col.listingCount }} {{ col.listingCount > 1 ? 'assets' : 'asset' }}
          </p>
        </div>
      </NuxtLink>
    </div>
    <div v-else class="surface p-8 text-center">
      <p class="text-muted text-sm">Aucune collection pour le moment.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Collections' })

const { data, error } = await useAsyncData('collections', () => useCollections().list())
const collections = computed(() => data.value ?? [])
</script>
