import type { ConsentRecord } from '~/types/consent'

// Appels API des consentements RGPD (/consents) regroupés pour garder les
// pages minces. Distinct de useConsent (singulier) : celui-ci gère le cookie
// analytics anonyme (bandeau cookies), ceci gère les consentements liés au
// compte, persistés côté serveur.
export function useConsents() {
  const api = useApi()

  const list = () => api.get<ConsentRecord[]>('/consents')

  const upsert = (category: string, isGranted: boolean, policyVersion: string) =>
    api.post<ConsentRecord>('/consents', { category, isGranted, policyVersion })

  return { list, upsert }
}
