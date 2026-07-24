<template>
  <div class="min-h-screen flex relative">
    <LayoutAppSidebar />
    <!-- flex-col here (nested in the outer row) lets the inner wrapper below
         stretch to fill this column's height, which is how the footer stays
         pinned to the bottom on short pages without going fixed/floating. -->
    <main class="min-w-0 flex-1 pt-[18px] px-[22px] pb-8 max-md:p-3.5 overflow-x-hidden flex flex-col">
      <div class="max-w-[1440px] mx-auto w-full flex flex-col flex-1">
        <LayoutAppTopbar />
        <!-- Grows to fill any leftover height, pushing the footer down to the
             viewport's bottom edge. On tall pages there's no leftover height
             to fill, so this is a no-op and the footer just follows the
             content in normal flow — never floating mid-page. -->
        <div class="flex-1">
          <slot />
        </div>
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
