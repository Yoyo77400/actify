<template>
  <div class="min-h-screen flex relative">
    <AdminSidebar />
    <main class="min-w-0 flex-1 pt-[18px] px-[22px] pb-8 max-md:p-3.5 overflow-x-hidden">
      <div class="max-w-[1280px] mx-auto">
        <slot />
      </div>
    </main>
    <AdminConfirmModal />
  </div>
</template>

<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'fr' },
  bodyAttrs: { class: 'theme-dark' },
  titleTemplate: (t) => t ? `${t} · Admin · Actify` : 'Admin · Actify'
})
</script>