<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4 relative">

    <div class="watermark watermark--left ethnocentric select-none" aria-hidden="true">ACTIFY</div>
    <div class="watermark watermark--right ethnocentric select-none" aria-hidden="true">LEDGER</div>

    <div class="surface w-full max-w-sm p-8 flex flex-col items-center gap-5 relative z-10">
      <nuxt-link to="/">
        <div class="flex flex-col items-center gap-2 text-center">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#7c5cbf] to-[#4a2d8a] flex items-center justify-center mb-1">
            <Icon name="ph:package" class="text-2xl text-white" />
          </div>
          <h1 class="ethnocentric text-foreground text-xl tracking-wide">ActiFy</h1>
          <p class="text-muted text-xs">Digital Curator Ledger</p>
        </div>
      </nuxt-link>
      <div class="text-center">
        <h2 class="text-foreground font-semibold text-lg">Sign in to Actify</h2>
        <p class="text-muted text-xs tracking-widest uppercase mt-1">Secure Gateway</p>
      </div>

      <AuthWalletPicker :pending="pending" @select="loginWithWallet" />

      <p v-if="error" class="text-red-400 text-xs text-center" role="alert">{{ error }}</p>

      <div class="w-full flex items-center gap-3">
        <div class="flex-1 h-px bg-line" />
        <span class="text-muted text-xs tracking-widest uppercase">Bientôt</span>
        <div class="flex-1 h-px bg-line" />
      </div>

      <div class="w-full flex flex-col gap-3">
        <AuthOAuthButton provider="google" disabled />
        <AuthOAuthButton provider="github" disabled />
      </div>

      <p class="text-muted text-xs text-center leading-relaxed">
        En vous connectant vous acceptez nos
        <NuxtLink to="/terms" class="text-accent hover:underline">Conditions</NuxtLink>
        et notre
        <NuxtLink to="/privacy" class="text-accent hover:underline">Politique de confidentialité</NuxtLink>
      </p>
    </div>

    <p class="text-muted text-xs mt-6 relative z-10">
      Nouveau sur Actify ?
      <span class="text-accent cursor-pointer hover:underline">Demander une invitation</span>
    </p>

    <footer class="absolute bottom-4 w-full px-6 flex items-center justify-between text-muted text-xs">
      <div class="flex gap-3.5 flex-wrap">
      <a href="#">Terms of Service</a>
      <a href="#">Privacy Policy</a>
      <a href="#">Support</a>
    </div>
    <p>© {{ year }} Actify. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

useHead({ title: 'Connexion' })

const { isLoggedIn } = useAuth()
const { pending, error, loginWithWallet } = useWalletAuth()

if (isLoggedIn.value) {
  await navigateTo('/profile')
}

const date = new Date()
const year = date.getFullYear()

</script>

<style scoped>
.watermark {
  position: absolute;
  font-size: clamp(80px, 15vw, 180px);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.03);
  user-select: none;
  pointer-events: none;
  letter-spacing: 0.05em;
}
.watermark--left {
  left: -2%;
  top: 50%;
  transform: translateY(-50%) rotate(-90deg);
  transform-origin: center;
}
.watermark--right {
  right: -2%;
  top: 50%;
  transform: translateY(-50%) rotate(90deg);
  transform-origin: center;
}
</style>
