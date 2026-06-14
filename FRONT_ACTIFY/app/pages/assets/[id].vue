<template>
  <div class="flex flex-col gap-7">
    <section class="grid grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)] max-lg:grid-cols-1 gap-[18px]">
      <AssetPreview :asset="payload.asset" />

      <div>
        <AssetInfoPanel :asset="payload.asset" :creator-verified="payload.creatorVerified" />
        <AssetTabs :tabs="payload.tabs" :description="payload.asset.description" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const assetId = computed(() => String(route.params.id))
const { data } = await useAssetData(assetId.value)
const payload = computed(() => data.value)

useHead({
  title: payload.value.asset.name,
  meta: [{ name: 'description', content: payload.value.asset.description }]
})
</script>
