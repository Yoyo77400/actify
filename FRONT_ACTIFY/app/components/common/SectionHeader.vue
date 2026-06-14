<template>
  <div ref="el" class="flex items-end justify-between gap-4 mb-3.5 section-header">
    <div>
      <h2 class="ethnocentric m-0 text-xl font-bold">{{ title }}</h2>
      <p v-if="subtitle" class="mt-1.5 mb-0 text-muted text-[13px]">{{ subtitle }}</p>
    </div>
    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()

const el = ref<HTMLElement>()
const visible = ref(false)

onMounted(() => {
  if (!el.value) return
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry && entry.isIntersecting) {
        visible.value = true
        el.value?.classList.add('section-header--visible')
        observer.disconnect()
      }
    },
    { threshold: 0.15 }
  )
  observer.observe(el.value)
})
</script>

<style scoped>
.section-header {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.section-header--visible {
  opacity: 1;
  transform: translateY(0);
}
</style>