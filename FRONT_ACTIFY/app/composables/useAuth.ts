import type { User } from '~/types/marketplace'

export function useAuth() {
  const store = useAuthStore()
  const { user, isLoggedIn } = storeToRefs(store)

  async function mockLogin(provider: 'google' | 'github') {
    // simule un délai de connexion OAuth
    await new Promise(resolve => setTimeout(resolve, 1000))

    const { data } = await useFetch<User>('https://bafybeigdkfaacirj7uf3mbdunriwl53xe4rwwjooum7iza3slyrmcdmqpi.ipfs.dweb.link/?filename=user.json')
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
