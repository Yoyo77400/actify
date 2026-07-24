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

  // Tokens are stateless (no server-side session yet), so logging out is
  // purely local: drop the cookies and the in-memory profile.
  function logout() {
    store.clearSession()
    navigateTo('/auth/login')
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
