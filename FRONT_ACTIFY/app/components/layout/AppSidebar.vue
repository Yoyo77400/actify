<template>
  <aside
    class="sticky top-0 h-screen flex flex-col bg-[#0f1117] border-r border-white/6 overflow-hidden z-50 shrink-0"
    :style="{ width: isExpanded ? '220px' : '72px', transition: 'width 0.3s ease' }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- Brand -->
    <div
      class="flex items-center gap-3 shrink-0 px-[17px] pt-5 pb-4 cursor-pointer"
      @click="togglePin"
    >
      <NuxtLink
        to="/"
        class="block w-[34px] h-[34px] rounded-full bg-[#f2ff00] shadow-[0_0_20px_rgba(242,255,0,0.35)] shrink-0"
        aria-label="Actify home"
        @click.stop
      />
      <span
        v-show="isExpanded"
        class="ethnocentric text-foreground text-lg font-bold whitespace-nowrap"
      >
        ACTIFY
      </span>
    </div>

    <!-- All nav items grouped together -->
    <nav class="flex flex-col gap-1 px-[17px]" aria-label="Primary navigation">
      <NuxtLink
        v-for="item in mainItems"
        :key="item.to"
        :to="item.to"
        class="sidebar-link"
        :class="isExpanded ? 'px-2' : 'justify-center'"
        :title="item.label"
      >
        <Icon :name="item.icon" class="text-xl shrink-0" />
        <span v-show="isExpanded" class="text-sm whitespace-nowrap">{{ item.label }}</span>
      </NuxtLink>

      <!-- Separator -->
      <div class="border-t border-white/10 my-2" :class="isExpanded ? '' : 'mx-1'" />

      <NuxtLink
        v-for="item in visibleFooterItems"
        :key="item.label"
        :to="item.to"
        class="sidebar-link"
        :class="isExpanded ? 'px-2' : 'justify-center'"
        :title="item.label"
      >
        <Icon :name="item.icon" class="text-xl shrink-0" />
        <span v-show="isExpanded" class="text-sm whitespace-nowrap">{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
interface SidebarItem {
  label: string
  to: string
  icon: string
}

const isExpanded = ref(false)
const isPinned = ref(false)

function togglePin() {
  isPinned.value = !isPinned.value
  isExpanded.value = isPinned.value
}

function onMouseEnter() {
  isExpanded.value = true
}

function onMouseLeave() {
  if (!isPinned.value) {
    isExpanded.value = false
  }
}

// Artist pages are reached from asset cards (no artist directory endpoint);
// the old hardcoded demo links to /artist/boto/* are gone with the mock era.
const mainItems: SidebarItem[] = [
  { label: 'Découvrir', to: '/', icon: 'ph:compass' },
  { label: 'Assets', to: '/assets', icon: 'ph:cube' },
  { label: 'Publier', to: '/asset/new', icon: 'ph:plus-circle' },
]
  
interface FooterItem extends SidebarItem {
  adminOnly?: boolean
}

const footerItems: FooterItem[] = [
  { label: 'Profile', to: '/profile', icon: 'ph:user-circle' },
  { label: 'Settings', to: '/settings/security', icon: 'mdi:cog-outline' },
  { label: 'Admin', to: '/admin', icon: 'ph:shield-check', adminOnly: true },
]

// The Admin entry is only rendered for admins — the route is guarded server-
// side too (middleware 'admin'), this just hides the link from everyone else.
const { user } = useAuth()
const visibleFooterItems = computed(() =>
  footerItems.filter((item) => !item.adminOnly || user.value?.role === 'admin'),
)
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
