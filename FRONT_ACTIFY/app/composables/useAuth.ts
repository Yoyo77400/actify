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

  return { user, isLoggedIn, fetchMe, logout }
}
