export type ConsentValue = 'accepted' | 'rejected'

// CNIL guidance: a consent choice may be remembered up to 6 months before
// asking again — hence 180 days, for the refusal as much as the acceptance.
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180

/**
 * Analytics-consent state shared by the banner and the Umami plugin.
 *
 * Backed by the `actify_consent` cookie so the choice survives reloads and is
 * readable during SSR (the banner renders — or not — server-side without a
 * hydration flash). Nuxt keeps every `useCookie` ref of the same name in sync,
 * so a click in the banner is immediately observed by the plugin's watcher.
 * `undefined` = no choice yet → the banner must be shown.
 */
export function useConsent() {
  const consent = useCookie<ConsentValue | undefined>('actify_consent', {
    maxAge: CONSENT_MAX_AGE,
    sameSite: 'lax',
  })

  function accept() {
    consent.value = 'accepted'
  }

  function reject() {
    consent.value = 'rejected'
  }

  return { consent, accept, reject }
}
