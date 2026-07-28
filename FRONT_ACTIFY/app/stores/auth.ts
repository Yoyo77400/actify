import type { MeProfile } from '~/types/auth'

/**
 * Session state — deliberately holds NO token.
 *
 * The access/refresh pair now lives in httpOnly cookies set by the API: the
 * browser attaches them on its own and this code cannot read them, so an XSS
 * can no longer exfiltrate a session. They used to sit in JS-readable cookies
 * because the wallet flow wrote them client-side.
 *
 * "Am I logged in?" is therefore answered by the profile the API returns for
 * the current cookies, never by inspecting a token.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<MeProfile | null>(null)
  const isLoggedIn = computed(() => !!user.value)

  // Set the moment a login succeeds, before the profile arrives: the session
  // plugin uses it to know a /users/me attempt is worth making.
  const authenticated = ref(false)

  function markAuthenticated() {
    authenticated.value = true
  }

  function setUser(profile: MeProfile) {
    user.value = profile
    authenticated.value = true
  }

  function clearSession() {
    user.value = null
    authenticated.value = false
  }

  return { user, isLoggedIn, authenticated, markAuthenticated, setUser, clearSession }
})
