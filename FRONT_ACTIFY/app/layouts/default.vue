<template>
  <div class="min-h-screen flex relative">
    <LayoutAppSidebar />
    <main class="min-w-0 flex-1 pt-[18px] px-[22px] pb-8 max-md:p-3.5 overflow-x-hidden">
      <div class="max-w-[1440px] mx-auto">
        <LayoutAppTopbar />
        <slot />
        <LayoutAppFooterBar />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'fr' },
  bodyAttrs: { class: 'theme-dark' },
  titleTemplate: (titleChunk) =>
    titleChunk ? `${titleChunk} · Actify Marketplace` : 'Actify Marketplace'
})
</script>
