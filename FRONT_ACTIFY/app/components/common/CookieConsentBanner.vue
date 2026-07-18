<template>
  <!-- pointer-events split: the fixed strip lets clicks pass through around
       the card, so the banner never blocks the page it overlays. -->
  <div
    v-if="!consent"
    role="region"
    aria-label="Consentement aux cookies"
    class="fixed inset-x-0 bottom-0 z-50 p-4 pointer-events-none"
  >
    <div class="surface pointer-events-auto mx-auto max-w-2xl p-5 flex flex-col gap-4">
      <div class="flex items-start gap-3">
        <Icon name="ph:cookie" class="text-xl text-accent-2 shrink-0 mt-0.5" aria-hidden="true" />
        <p class="text-muted text-sm leading-relaxed">
          Actify utilise uniquement des cookies techniques nécessaires à votre
          session, exemptés de consentement. Avec votre accord, nous activons en
          plus une mesure d'audience via Umami, respectueuse de la vie privée :
          sans cookie, sans suivi entre sites, hébergée par nos soins.
          <NuxtLink to="/privacy" class="text-accent hover:underline">
            Politique de confidentialité
          </NuxtLink>
        </p>
      </div>
      <div class="flex flex-wrap justify-end gap-3">
        <button type="button" class="secondary-btn consent-btn text-sm px-5" @click="reject">
          Refuser
        </button>
        <button type="button" class="primary-btn consent-btn text-sm px-5" @click="accept">
          Accepter
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Visible only while no choice is stored; accept/reject persist the choice
// (180 days, see useConsent) and hide the banner reactively. The cookie is
// read during SSR, so returning visitors never see a hydration flash.
const { consent, accept, reject } = useConsent()
</script>

<style scoped>
/* The global reset keeps browser focus outlines, but on this dark UI an
   explicit high-contrast ring is clearer for keyboard users. */
.consent-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
