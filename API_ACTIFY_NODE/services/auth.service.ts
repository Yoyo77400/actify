import { prisma } from './prisma'
import { AppError } from '../utils/http'
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt'

// Stateless refresh: the refresh token is self-contained (no session store
// yet), so we can only re-check the user's current standing before minting a
// new access token. Revocation lists come with the Auth2/session work.
export async function refreshSession(refreshToken: string) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'refreshToken est requis')
  }

  const payload = verifyToken(refreshToken)
  if (!payload || payload.type !== 'refresh' || typeof payload.sub !== 'string') {
    throw new AppError(401, 'AUTH_REQUIRED', 'Refresh token invalide ou expiré')
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || user.deletedAt) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Refresh token invalide ou expiré')
  }
  if (user.isBanned) {
    throw new AppError(403, 'USER_BANNED', 'Compte banni')
  }

  // Rotation: hand back a fresh refresh token so clients always hold the
  // newest one. Statelessness means the old token stays valid until expiry —
  // true revocation needs the session store. The session's mfa level is
  // carried over: rotation must not downgrade a 2FA-validated login.
  const mfa = payload.mfa === true
  return {
    accessToken: signAccessToken(user.id, { mfa }),
    refreshToken: signRefreshToken(user.id, { mfa }),
  }
}
