import { AppError } from '../utils/http'
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt'
import { findUsableSession, touchSession } from './sessions.service'

// Refresh is bound to a server session: a revoked one can no longer mint
// anything, which is what makes logout and "revoke this device" real.
export async function refreshSession(refreshToken: string) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'refreshToken est requis')
  }

  const payload = verifyToken(refreshToken)
  if (!payload || payload.type !== 'refresh' || typeof payload.sub !== 'string') {
    throw new AppError(401, 'AUTH_REQUIRED', 'Refresh token invalide ou expiré')
  }

  const sid = typeof payload.sid === 'string' ? payload.sid : null
  if (!sid) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Refresh token invalide ou expiré')
  }

  const session = await findUsableSession(sid)
  if (!session || session.userId !== payload.sub) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Refresh token invalide ou expiré')
  }
  if (session.user.isBanned) {
    throw new AppError(403, 'USER_BANNED', 'Compte banni')
  }

  // Sliding expiry: an actively used session stays alive, an abandoned one dies
  // on its own. Rotation keeps the same session id, so revoking it still kills
  // every token derived from it. mfa is carried over — rotation must not
  // downgrade a 2FA-validated login.
  await touchSession(sid)
  const mfa = payload.mfa === true
  return {
    accessToken: signAccessToken(session.userId, { mfa, sid }),
    refreshToken: signRefreshToken(session.userId, { mfa, sid }),
  }
}
