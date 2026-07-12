// Guards the /admin/* area: must be logged in AND hold the admin role.
// Non-admins are bounced to the marketplace, logged-out users to login.
export default defineNuxtRouteMiddleware(() => {
  const store = useAuthStore()
  if (!store.isLoggedIn) {
    return navigateTo('/auth/login')
  }
  if (store.user?.role !== 'admin') {
    return navigateTo('/')
  }
})
