export default defineNuxtRouteMiddleware(() => {
  const store = useAuthStore()
  if (!store.isLoggedIn) {
    return navigateTo('/auth/login')
  }
})
