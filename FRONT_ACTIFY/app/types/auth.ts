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
  twoFactorEnabled: boolean
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

// 1er facteur (signature wallet) validé mais 2FA active : le login n'est pas
// encore ouvert, il faut échanger pendingToken + code TOTP sur /auth/verify-2fa.
export interface WalletVerifyTotpRequired {
  mode: 'totp_required'
  requires2FA: true
  pendingToken: string
}

export type WalletVerifyResult =
  | WalletVerifyAuthenticated
  | WalletVerifyLinked
  | WalletVerifyTotpRequired

// Réponse de /auth/2fa/setup : QR à scanner + secret pour la saisie manuelle.
export interface TwoFactorSetup {
  qrCode: string
  secret: string
  otpauthUri: string
}

// Réponse de /auth/verify-2fa : le vrai jeton, une fois le code validé.
export interface TwoFactorLoginResult {
  accessToken: string
  refreshToken: string
  user: { id: string; username: string | null }
}
