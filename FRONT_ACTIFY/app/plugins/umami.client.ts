// Injects the self-hosted Umami tracker, strictly gated on user consent.
// Client-only (`.client` suffix): the script tag is DOM-appended, never part
// of the SSR payload — a visitor who refused (or hasn't chosen) ships zero
// analytics bytes. `immediate: true` covers a returning visitor who already
// accepted; the watcher covers an acceptance made after page load, without a
// reload. The `injected` flag makes re-acceptance within one visit a no-op.
export default defineNuxtPlugin(() => {
  const { umamiHost, umamiWebsiteId } = useRuntimeConfig().public

  // Empty config = analytics disabled for this deployment.
  if (!umamiHost || !umamiWebsiteId) return

  const { consent } = useConsent()
  let injected = false

  watch(
    consent,
    (value) => {
      if (value !== 'accepted' || injected) return
      injected = true
      const script = document.createElement('script')
      script.defer = true
      script.src = `${umamiHost}/script.js`
      script.dataset.websiteId = umamiWebsiteId
      document.head.appendChild(script)
    },
    { immediate: true },
  )
})
