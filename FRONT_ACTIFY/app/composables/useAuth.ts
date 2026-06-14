import type { User } from '~/types/marketplace'

export function useAuth() {
  const store = useAuthStore()
  const { user, isLoggedIn } = storeToRefs(store)

  async function mockLogin(provider: 'google' | 'github') {
    // simule un délai de connexion OAuth
    await new Promise(resolve => setTimeout(resolve, 1000))

    const { data } = await useFetch<User>('https://ipfs.io/ipns/k51qzi5uqu5dgceyd3jw1frpcnqbd4thybutzgn6u8h6lus91op97lm964b29c')
    if (data.value) {
      store.setUser({
        ...data.value,
        // personnalise selon le provider pour le mock
        email: provider === 'github'
          ? 'fouad@github.com'
          : 'fouad@gmail.com'
      })
    }

    await navigateTo('/')
  }

  function logout() {
    store.logout()
    navigateTo('/auth/login')
  }

  return { user, isLoggedIn, mockLogin, logout }
}
