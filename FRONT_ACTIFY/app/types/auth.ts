// Shapes returned by API_ACTIFY_NODE (see api-routes-complete.md).

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface WalletInfo {
  id: string
  address: string
  chain: string
  label: string | null
  isPrimary: boolean
  createdAt: string
}

export interface MeStats {
  listingsCount: number
  purchasesCount: number
  downloadsCount: number
  reviewsCount: number
  favoritesCount: number
}

export interface MeProfile {
  id: string
  username: string | null
  displayName: string | null
  email: string | null
  bio: string | null
  avatarCid: string | null
  wallets: WalletInfo[]
  role: string
  isVerified: boolean
  createdAt: string
  stats: MeStats
}

export interface WalletChallenge {
  nonce: string
  message: string
  expiresAt: string
}

export interface WalletVerifyAuthenticated {
  mode: 'authenticated'
  isNewAccount: boolean
  accessToken: string
  refreshToken: string
  user: { id: string; username: string | null; role: string }
}

export interface WalletVerifyLinked {
  mode: 'linked'
}

export type WalletVerifyResult = WalletVerifyAuthenticated | WalletVerifyLinked
