import type { User } from '~/types/marketplace'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => !!user.value)

  function setUser(u: User) {
    user.value = u
  }

  function logout() {
    user.value = null
  }

  return { user, isLoggedIn, setUser, logout }
})
