import QRCode from 'qrcode'
import { prisma } from './prisma'
import { AppError } from '../utils/http'
import { generateTotpSecret, buildOtpauthUri, verifyTotp } from '../utils/totp'
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt'

async function getUserOrThrow(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.deletedAt) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable')
  }
  return user
}

// Enrôlement A : stocke le secret mais laisse twoFactorEnabled à false tant
// qu'un premier code n'a pas été confirmé, pour ne pas verrouiller le compte.
export async function setupTwoFactor(userId: string) {
  const user = await getUserOrThrow(userId)
  if (user.twoFactorEnabled) {
    throw new AppError(409, 'TWO_FACTOR_ALREADY_ENABLED', 'La 2FA est déjà activée')
  }

  const secret = generateTotpSecret()
  const otpauthUri = buildOtpauthUri(user.username ?? user.email ?? user.id, secret)
  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } })

  const qrCode = await QRCode.toDataURL(otpauthUri)
  return { qrCode, secret, otpauthUri }
}

// Enrôlement B : valide le premier code avant d'activer la 2FA.
export async function confirmTwoFactor(userId: string, code: string) {
  if (!code || typeof code !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'code est requis')
  }

  const user = await getUserOrThrow(userId)
  if (!user.twoFactorSecret) {
    throw new AppError(400, 'TWO_FACTOR_NOT_INITIATED', 'Aucun enrôlement 2FA en cours')
  }
  if (!verifyTotp(code, user.twoFactorSecret)) {
    throw new AppError(401, 'TWO_FACTOR_INVALID_CODE', 'Code incorrect. Activation avortée.')
  }

  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } })
  return { enabled: true }
}

// Second verrou du login : échange le pending token (1er facteur validé) + le
// code TOTP contre un jeton d'accès portant mfa:true.
export async function verifyLoginTotp(pendingToken: string, code: string) {
  if (!pendingToken || typeof pendingToken !== 'string' || !code || typeof code !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'pendingToken et code sont requis')
  }

  const payload = verifyToken(pendingToken)
  if (!payload || payload.type !== '2fa' || typeof payload.sub !== 'string') {
    throw new AppError(401, 'AUTH_REQUIRED', 'Session 2FA invalide ou expirée')
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || user.deletedAt) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Session 2FA invalide ou expirée')
  }
  if (user.isBanned) {
    throw new AppError(403, 'USER_BANNED', 'Compte banni')
  }
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new AppError(400, 'TWO_FACTOR_NOT_ENABLED', '2FA non activée pour ce compte')
  }
  if (!verifyTotp(code, user.twoFactorSecret)) {
    throw new AppError(401, 'TWO_FACTOR_INVALID_CODE', 'Code 2FA invalide ou expiré')
  }

  return {
    accessToken: signAccessToken(user.id, { mfa: true }),
    refreshToken: signRefreshToken(user.id, { mfa: true }),
    user: { id: user.id, username: user.username },
  }
}
