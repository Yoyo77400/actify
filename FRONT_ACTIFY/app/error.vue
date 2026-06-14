<template>
  <div
    ref="container"
    class="relative w-full min-h-dvh overflow-hidden flex flex-col items-center justify-center"
    style="background: #080a12; font-family: 'Ethnocentric', sans-serif;"
    @mousemove="onMouseMove"
  >
    <!-- Particle canvas -->
    <canvas ref="particleCanvas" class="absolute inset-0 z-[1] pointer-events-none" />

    <!-- Single subtle orb -->
    <div
      class="absolute w-[500px] h-[500px] max-sm:w-[280px] max-sm:h-[280px] rounded-full z-[1] pointer-events-none blur-[100px] transition-transform duration-700 ease-out"
      style="background: radial-gradient(circle, rgba(110,90,220,0.12) 0%, transparent 70%); top: 35%; left: 40%;"
      :style="orbStyle"
    />

    <!-- Watermark left -->
    <div
      class="absolute left-[2%] top-1/2 z-[2] flex flex-col leading-[0.9] tracking-wider pointer-events-none select-none hidden lg:flex"
      style="font-size: clamp(4rem,9vw,9rem); color: rgba(255,255,255,0.025); writing-mode: vertical-rl; transform: translateY(-50%) rotate(180deg);"
    >
      <span>ACTIFY</span>
      <span>404</span>
    </div>

    <!-- Watermark right -->
    <div
      class="absolute right-[2%] top-1/2 z-[2] flex flex-col leading-[0.9] tracking-wider pointer-events-none select-none hidden lg:flex"
      style="font-size: clamp(4rem,9vw,9rem); color: rgba(255,255,255,0.025); writing-mode: vertical-rl; transform: translateY(-50%);"
    >
      <span>ACTIFY</span>
      <span>404</span>
    </div>

    <!-- Main content -->
    <div class="relative z-[5] flex flex-col items-center text-center px-6">
      <!-- 404 -->
      <div class="flex items-center justify-center gap-1 md:gap-4 mb-3 opacity-0 animate-fade-in">
        <span
          class="leading-none"
          style="font-size: clamp(4.5rem,14vw,12rem); color: transparent; -webkit-text-stroke: 1px rgba(110,90,220,0.3);"
        >4</span>
        <span
          class="leading-none"
          style="font-size: clamp(4.5rem,14vw,12rem); color: transparent; -webkit-text-stroke: 1px rgba(110,90,220,0.3);"
        >0</span>
        <span
          class="leading-none"
          style="font-size: clamp(4.5rem,14vw,12rem); color: transparent; -webkit-text-stroke: 1px rgba(110,90,220,0.3);"
        >4</span>
      </div>

      <!-- OUPS with occasional glitch -->
      <h1
        class="tracking-[0.25em] opacity-0 animate-fade-in-slow"
        :class="{ 'is-glitching': isGlitching }"
        style="font-size: clamp(2rem,7vw,5rem); color: #e2e0f0; text-shadow: 0 0 60px rgba(110,90,220,0.2);"
      >
        OUPS
      </h1>

      <!-- Subtitle -->
      <p
        class="mt-6 max-w-md opacity-0 animate-fade-in-late text-[#4a4860] tracking-wide leading-relaxed"
        style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: clamp(0.8rem,1.4vw,0.95rem);"
      >
        Cette page s'est perdue dans la blockchain.<br>
        Mais pas de panique, on vous ramène.
      </p>

      <!-- CTA -->
      <button
        type="button"
        @click="leave('/')"
        class="cta-btn group relative inline-flex items-center gap-3 mt-10 px-6 py-3 border border-white/10 rounded transition-all duration-300 cursor-pointer hover:border-[rgba(110,90,220,0.4)] hover:-translate-y-px"
        style="font-family: 'Ethnocentric', sans-serif; font-size: clamp(0.55rem,1.1vw,0.7rem); letter-spacing: 0.12em; color: #c5c3d6; background: rgba(255,255,255,0.02);"
      >
        <span>Retour à l'accueil</span>
        <svg class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 20 20" fill="none">
          <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <!-- Footer -->
    <footer
      class="absolute bottom-0 left-0 right-0 z-[5] flex flex-col md:flex-row justify-between items-center md:items-end p-4 md:px-6 md:py-5 gap-3 md:gap-0 text-xs"
      style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: rgba(255,255,255,0.2);"
    >
      <div class="flex flex-col gap-1 items-center md:items-start">
        <span>© 2024 ActiFy Ledger. All Rights Reserved.</span>
        <nav class="flex gap-4">
          <button type="button" @click="leave('/privacy')" class="underline underline-offset-2 text-white/30 hover:text-[#8b7aef] transition-colors duration-300 cursor-pointer">GDPR Privacy</button>
          <button type="button" @click="leave('/terms')" class="underline underline-offset-2 text-white/30 hover:text-[#8b7aef] transition-colors duration-300 cursor-pointer">Terms of Service</button>
        </nav>
      </div>
      <div class="flex flex-col gap-1 items-center md:items-end">
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-green-400" style="box-shadow: 0 0 6px rgba(74,222,128,0.4);" />
          <span>Solana Status: Operational</span>
        </div>
        <button type="button" @click="leave('/security')" class="underline underline-offset-2 text-white/30 hover:text-[#8b7aef] transition-colors duration-300 cursor-pointer">Security</button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'

definePageMeta({ layout: false })

// On an error page, internal links don't reset the error state — use clearError.
const leave = (to) => clearError({ redirect: to })

useHead({
  title: '404 — ActiFy Ledger',
  link: [{ rel: 'stylesheet', href: 'https://fonts.cdnfonts.com/css/ethnocentric' }]
})

const container = ref(null)
const particleCanvas = ref(null)
const isGlitching = ref(false)
const mouse = reactive({ x: 0.5, y: 0.5 })
let animationFrame = null
let glitchTimeout = null

const orbStyle = computed(() => ({
  transform: `translate(${mouse.x * 20 - 10}px, ${mouse.y * 20 - 10}px)`
}))

function onMouseMove(e) {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  mouse.x = (e.clientX - rect.left) / rect.width
  mouse.y = (e.clientY - rect.top) / rect.height
}

// Minimal particle system — just floating dots, no connections
function initParticles() {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  let particles = []

  function resize() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  class Particle {
    constructor() { this.reset(true) }
    reset(initial = false) {
      this.x = Math.random() * canvas.width
      this.y = Math.random() * canvas.height
      this.size = Math.random() * 1.5 + 0.3
      this.speedX = (Math.random() - 0.5) * 0.3
      this.speedY = (Math.random() - 0.5) * 0.3
      this.baseOpacity = Math.random() * 0.3 + 0.05
      this.phase = Math.random() * Math.PI * 2
    }
    update(time) {
      this.x += this.speedX
      this.y += this.speedY
      // Soft breathing opacity
      this.opacity = this.baseOpacity + Math.sin(time * 0.001 + this.phase) * 0.05
      if (this.x < -10) this.x = canvas.width + 10
      if (this.x > canvas.width + 10) this.x = -10
      if (this.y < -10) this.y = canvas.height + 10
      if (this.y > canvas.height + 10) this.y = -10
    }
    draw() {
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(110,90,220,${this.opacity})`
      ctx.fill()
    }
  }

  // Way fewer particles
  const count = Math.min(40, Math.floor((canvas.width * canvas.height) / 30000))
  for (let i = 0; i < count; i++) particles.push(new Particle())

  function animate(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particles.forEach(p => { p.update(time); p.draw() })
    animationFrame = requestAnimationFrame(animate)
  }
  animationFrame = requestAnimationFrame(animate)
}

// Rare, subtle glitch — feels like a real bug, not a show
function scheduleGlitch() {
  const delay = 4000 + Math.random() * 8000 // 4-12s between glitches
  glitchTimeout = setTimeout(() => {
    isGlitching.value = true
    setTimeout(() => {
      isGlitching.value = false
      scheduleGlitch()
    }, 100 + Math.random() * 150) // Very short glitch
  }, delay)
}

onMounted(() => {
  initParticles()
  scheduleGlitch()
})

onBeforeUnmount(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  if (glitchTimeout) clearTimeout(glitchTimeout)
})
</script>

<style>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.7s ease-out 0.1s forwards;
}
.animate-fade-in-slow {
  animation: fade-in 0.8s ease-out 0.35s forwards;
}
.animate-fade-in-late {
  animation: fade-in 0.7s ease-out 0.6s forwards;
}

/* Glitch — short, subtle, rare */
.is-glitching {
  animation: glitch 0.15s steps(2) !important;
  opacity: 1 !important;
}

@keyframes glitch {
  0% { text-shadow: 1px 0 rgba(220,90,110,0.6), -1px 0 rgba(90,200,220,0.6); transform: translateX(0); }
  50% { text-shadow: -1px 0 rgba(220,90,110,0.6), 1px 0 rgba(90,200,220,0.6); transform: translateX(-2px); }
  100% { text-shadow: 0 0 60px rgba(110,90,220,0.2); transform: translateX(0); }
}

.cta-btn:hover {
  background: rgba(110,90,220,0.06) !important;
  box-shadow: 0 4px 20px rgba(110,90,220,0.1);
}

@media (prefers-reduced-motion: reduce) {
  .is-glitching { animation: none !important; }
  .animate-fade-in, .animate-fade-in-slow, .animate-fade-in-late {
    animation: none !important;
    opacity: 1 !important;
  }
}
</style>