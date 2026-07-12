<template>
  <section class="surface relative min-h-[310px] overflow-hidden">
    <transition name="hero-fade" mode="out-in">
      <img
        :key="slide.id"
        class="absolute inset-0 w-full h-full object-cover brightness-[0.42]"
        :src="slide.image"
        :alt="slide.title"
      >
    </transition>
    <div
      class="absolute inset-0"
      style="background: linear-gradient(90deg, rgba(0,0,0,0.76) 0%, rgba(0,0,0,0.34) 55%, rgba(0,0,0,0.16) 100%)"
    />

    <div class="relative z-10 flex flex-col justify-end min-h-[310px] p-[26px] max-sm:p-4">
      <div>
        <span class="pill-badge ethnocentric">Featured</span>
        <h1 class="ethnocentric mt-4 mb-2 text-[clamp(22px,4vw,38px)]">
          {{ slide.title }}
          <span v-if="slide.verified" class="text-verified text-[0.7em]">✔</span>
        </h1>
        <p class="m-0 text-muted">By {{ slide.creator }}</p>
      </div>

      <div class="mt-[22px] grid grid-cols-4 max-md:grid-cols-2 gap-2.5 max-w-[560px]">
        <article
          v-for="stat in slide.stats"
          :key="stat.label"
          class="p-2.5 px-3 rounded-xl border border-line bg-[rgba(8,11,17,0.62)] backdrop-blur-[8px]"
        >
          <span class="block text-muted text-xs uppercase tracking-[0.08em]">{{ stat.label }}</span>
          <strong class="block mt-1.5">{{ stat.value }}</strong>
        </article>
      </div>

      <div class="flex gap-2 justify-center mt-5">
        <button
          v-for="(item, i) in slides"
          :key="item.id"
          class="w-[26px] h-1 rounded-full border-0 p-0 transition-all duration-300"
          :class="i === current ? 'bg-white w-[36px]' : 'bg-white/22'"
          type="button"
          @click="goTo(i)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { HeroSlide } from '~/types/marketplace'

const props = defineProps<{
  slides: HeroSlide[]
}>()

const current = ref(0)
const slide = computed(() => props.slides[current.value]!)

function goTo(i: number) {
  current.value = i
}

let interval: ReturnType<typeof setInterval>
onMounted(() => {
  interval = setInterval(() => {
    current.value = (current.value + 1) % props.slides.length
  }, 5000)
})
onUnmounted(() => clearInterval(interval))
</script>

<style scoped>
.hero-fade-enter-active,
.hero-fade-leave-active {
  transition: opacity 0.6s ease;
}
.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
}
</style>