import { FetchError } from 'ofetch'

// Rehydrates the profile from the token cookies on app start (SSR pass first,
// state then transfers to the client via the Pinia payload).
export default defineNuxtPlugin(async () => {
  const store = useAuthStore()
  // Les jetons sont httpOnly : impossible de savoir d'avance s'il y a une
  // session. On tente donc /users/me ; un 401 signifie simplement « anonyme ».
  if (store.user) return

  try {
    await useAuth().fetchMe()
  } catch (err) {
    // Stale/revoked tokens → drop them. Anything else (API unreachable, …)
    // keeps the cookies so a reload can recover the session.
    if (err instanceof FetchError && (err.statusCode === 401 || err.statusCode === 403)) {
      store.clearSession()
    }
  }
})
