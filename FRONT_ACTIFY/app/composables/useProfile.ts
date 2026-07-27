import type { MeProfile } from '~/types/auth'

export interface ProfileEdits {
  username: string | null
  displayName: string | null
  bio: string | null
}

/**
 * Profile edition (PUT /users/me) and its two image uploads.
 *
 * The images have their own endpoints because PUT /users/me only takes an
 * already-stored key: the bytes have to reach the server first. Each upload
 * persists the new key server-side on its own, so it is independent from
 * saving the text fields.
 */
export function useProfile() {
  const api = useApi()

  return {
    update: (edits: ProfileEdits) => api.put<MeProfile>('/users/me', edits),

    uploadAvatar: (file: File) => {
      const fd = new FormData()
      fd.append('avatar', file)
      return api.post<{ avatarCid: string }>('/users/me/avatar', fd)
    },

    uploadBanner: (file: File) => {
      const fd = new FormData()
      fd.append('banner', file)
      return api.post<{ bannerCid: string }>('/users/me/banner', fd)
    },
  }
}
