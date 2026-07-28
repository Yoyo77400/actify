import type { CreatorCard } from '~/types/marketplace'

// Shared by any view that lists CreatorCard rows with a follow/unfollow
// button (artists directory, homepage highlights, ...).
export function useCreatorFollowToggle() {
  const follows = useFollows()
  const { user, isLoggedIn } = useAuth()

  const togglingId = ref<string | null>(null)

  function canFollow(creator: CreatorCard): boolean {
    return isLoggedIn.value && user.value?.id !== creator.id
  }

  async function toggleFollow(creator: CreatorCard) {
    if (!creator.username || togglingId.value) return
    togglingId.value = creator.id
    try {
      if (creator.isFollowing) {
        await follows.unfollow(creator.username)
        creator.isFollowing = false
      } else {
        await follows.follow(creator.username)
        creator.isFollowing = true
      }
    } catch {
      // Best-effort toggle: on failure the button simply stays as it was.
    } finally {
      togglingId.value = null
    }
  }

  return { canFollow, toggleFollow, togglingId }
}
