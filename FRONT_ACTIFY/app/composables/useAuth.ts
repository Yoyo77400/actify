import type { MeProfile } from '~/types/auth'

export function useAuth() {
  const store = useAuthStore()
  const api = useApi()
  const { user, isLoggedIn } = storeToRefs(store)

  async function fetchMe(): Promise<MeProfile> {
    const me = await api.get<MeProfile>('/users/me')
    store.setUser(me)
    return me
  }

  // Revokes the server session first: without that call, the tokens stayed
  // valid for their whole TTL and "logging out" only hid them from this
  // browser. Local state is cleared regardless — a network failure must not
  // leave the user seemingly signed in.
  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // Already expired or revoked: nothing left to cut server-side.
    } finally {
      store.clearSession()
      await navigateTo('/auth/login')
    }
  }

  // RGPD : export complet (portabilité) et suppression de compte (droit à
  // l'oubli). Toutes deux exigent le step-up 2FA côté API pour les comptes
  // qui l'ont activée — déjà satisfait par une session normale puisque le
  // login avec 2FA active n'émet un jeton qu'après vérification du code.
  const exportData = () => api.get<Record<string, unknown>>('/users/me/data-export')

  // Le wallet est l'unique identifiant : le supprimer ferme définitivement
  // l'accès au compte, il n'y a donc rien à révoquer côté serveur ensuite.
  async function deleteAccount() {
    await api.del('/users/me')
    store.clearSession()
  }

  return { user, isLoggedIn, fetchMe, logout, exportData, deleteAccount }
}
