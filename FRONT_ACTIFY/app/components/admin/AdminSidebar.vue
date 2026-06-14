<template>
  <aside
    class="sticky top-0 h-screen flex flex-col bg-[#0f1117] border-r border-white/6 overflow-hidden z-50 shrink-0"
    :style="{ width: expanded ? '210px' : '72px', transition: 'width 0.3s ease' }"
    @mouseenter="expanded = true"
    @mouseleave="expanded = false"
  >
    <div class="flex items-center gap-3 shrink-0 px-[17px] pt-5 pb-4">
      <NuxtLink
        to="/admin"
        class="block w-[34px] h-[34px] rounded-full bg-danger shadow-[0_0_20px_rgba(255,91,106,0.35)] shrink-0"
        aria-label="Admin home"
      />
      <span v-show="expanded" class="ethnocentric text-foreground text-base font-bold whitespace-nowrap">
        ADMIN
      </span>
    </div>

    <nav class="flex flex-col gap-1 px-[17px]" aria-label="Admin navigation">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="sidebar-link"
        :class="expanded ? 'px-2' : 'justify-center'"
        :title="item.label"
      >
        <Icon :name="item.icon" class="text-xl shrink-0" />
        <span v-show="expanded" class="text-sm whitespace-nowrap">{{ item.label }}</span>
      </NuxtLink>

      <div class="border-t border-white/10 my-2" />

      <NuxtLink
        to="/"
        class="sidebar-link"
        :class="expanded ? 'px-2' : 'justify-center'"
        title="Back to site"
      >
        <Icon name="ph:arrow-left" class="text-xl shrink-0" />
        <span v-show="expanded" class="text-sm whitespace-nowrap">Back to site</span>
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
const expanded = ref(false)

const items = [
  { label: 'Dashboard', to: '/admin', icon: 'ph:squares-four' },
  { label: 'Users', to: '/admin/users', icon: 'ph:users' },
  { label: 'Sales', to: '/admin/sales', icon: 'ph:receipt' },
  { label: 'Assets', to: '/admin/assets', icon: 'ph:cube' },
  { label: 'Reports', to: '/admin/reports', icon: 'ph:flag' },
]
</script>

<style scoped>
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 42px;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.sidebar-link:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.06);
}
.sidebar-link.router-link-active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}
</style>