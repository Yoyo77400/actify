import type { MeProfile } from '~/types/auth'

const ACCESS_TOKEN_MAX_AGE = 60 * 15
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7
// Dev runs on plain http://localhost where Secure cookies are dropped.
const SECURE_COOKIES = !import.meta.dev

export const useAuthStore = defineStore('auth', () => {
  // Cookies (not localStorage) so the session survives reloads AND is visible
  // during SSR. Not httpOnly by construction — the wallet flow needs to write
  // them client-side; acceptable until the Auth2/session work moves issuance
  // server-side.
  const accessToken = useCookie<string | null>('actify_token', {
    maxAge: ACCESS_TOKEN_MAX_AGE,
    sameSite: 'lax',
    secure: SECURE_COOKIES,
  })
  const refreshToken = useCookie<string | null>('actify_refresh', {
    maxAge: REFRESH_TOKEN_MAX_AGE,
    sameSite: 'lax',
    secure: SECURE_COOKIES,
  })

  const user = ref<MeProfile | null>(null)
  const isLoggedIn = computed(() => !!user.value)

  function setTokens(tokens: { accessToken: string; refreshToken?: string }) {
    accessToken.value = tokens.accessToken
    if (tokens.refreshToken) {
      refreshToken.value = tokens.refreshToken
    }
  }

  function setUser(profile: MeProfile) {
    user.value = profile
  }

  function clearSession() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
  }

  return { accessToken, refreshToken, user, isLoggedIn, setTokens, setUser, clearSession }
})
