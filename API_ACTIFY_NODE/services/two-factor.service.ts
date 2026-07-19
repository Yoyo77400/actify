import QRCode from 'qrcode'
import { prisma } from './prisma'
import { AppError } from '../utils/http'
import { generateTotpSecret, buildOtpauthUri, verifyTotp } from '../utils/totp'
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt'

// Orchestration du 2FA (TOTP) : combine le noyau crypto pur (utils/totp),
// le stockage (Prisma) et le rendu QR. La vérification au login vit dans le
// flux wallet (verify-2fa) et réutilise verifyTotp directement.

async function getUserOrThrow(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.deletedAt) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable')
  }
  return user
}

// Étape A de l'enrôlement : génère un secret, le stocke SANS activer le 2FA
// (enabled reste false tant qu'un premier code n'a pas été confirmé), et
// renvoie le QR à scanner + le secret en clair pour la saisie manuelle.
export async function setupTwoFactor(userId: string) {
  const user = await getUserOrThrow(userId)
  if (user.twoFactorEnabled) {
    throw new AppError(409, 'TWO_FACTOR_ALREADY_ENABLED', 'La 2FA est déjà activée')
  }

  const secret = generateTotpSecret()
  const accountName = user.username ?? user.email ?? user.id
  const otpauthUri = buildOtpauthUri(accountName, secret)

  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } })

  const qrCode = await QRCode.toDataURL(otpauthUri)
  return { qrCode, secret, otpauthUri }
}

// Étape B de l'enrôlement : valide le premier code généré par l'app mobile
// contre le secret en attente. Prouve la synchronisation avant de verrouiller
// le compte — sur échec, on n'active rien.
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

// Second verrou du login : échange le jeton intermédiaire (1er facteur validé)
// + le code TOTP contre un vrai jeton d'accès portant mfa:true. C'est le seul
// endroit qui consomme le pending token émis par le flux wallet.
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
    refreshToken: signRefreshToken(user.id),
    user: { id: user.id, username: user.username },
  }
}
