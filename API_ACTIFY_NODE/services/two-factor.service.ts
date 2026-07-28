import QRCode from 'qrcode'
import { prisma } from './prisma'
import { AppError } from '../utils/http'
import { generateTotpSecret, buildOtpauthUri, verifyTotp } from '../utils/totp'
import { verifyToken } from '../utils/jwt'
import { openSession, type SessionContext } from './sessions.service'

// Au-delà, le compte est verrouillé : 5 essais couvrent largement une faute de
// frappe ou une horloge légèrement désynchronisée.
const MAX_TOTP_ATTEMPTS = 5
const TOTP_LOCK_MS = 15 * 60 * 1000

/**
 * Refuse la vérification quand le compte est verrouillé.
 *
 * Complète le rate limit par IP, qu'un attaquant réparti sur plusieurs adresses
 * contourne : ce compteur-ci suit le COMPTE visé. Verrouiller ne crée pas de
 * déni de service exploitable, car on n'atteint l'étape TOTP qu'après une
 * signature wallet valide — un attaquant capable de verrouiller un compte
 * détient déjà sa clé privée.
 */
function assertNotLocked(user: { totpLockedUntil: Date | null }) {
  if (user.totpLockedUntil && user.totpLockedUntil > new Date()) {
    const seconds = Math.ceil((user.totpLockedUntil.getTime() - Date.now()) / 1000)
    throw new AppError(
      429,
      'TOTP_LOCKED',
      `Trop de codes incorrects. Réessayez dans ${Math.ceil(seconds / 60)} minute(s).`,
    )
  }
}

/** Échec : incrémente, et verrouille au seuil. Le compteur repart de zéro au verrouillage. */
async function registerFailedTotp(user: { id: string; totpFailedAttempts: number }) {
  const attempts = user.totpFailedAttempts + 1
  const locked = attempts >= MAX_TOTP_ATTEMPTS

  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpFailedAttempts: locked ? 0 : attempts,
      totpLockedUntil: locked ? new Date(Date.now() + TOTP_LOCK_MS) : undefined,
    },
  })
}

/** Succès : on repart d'une ardoise vierge, sinon des échecs anciens finiraient par verrouiller. */
async function clearTotpFailures(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { totpFailedAttempts: 0, totpLockedUntil: null },
  })
}

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
  assertNotLocked(user)
  if (!verifyTotp(code, user.twoFactorSecret)) {
    await registerFailedTotp(user)
    throw new AppError(401, 'TWO_FACTOR_INVALID_CODE', 'Code incorrect. Activation avortée.')
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true, totpFailedAttempts: 0, totpLockedUntil: null },
  })
  return { enabled: true }
}

// Second verrou du login : échange le pending token (1er facteur validé) + le
// code TOTP contre un jeton d'accès portant mfa:true.
export async function verifyLoginTotp(pendingToken: string, code: string, context: SessionContext = {}) {
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
  assertNotLocked(user)
  if (!verifyTotp(code, user.twoFactorSecret)) {
    await registerFailedTotp(user)
    throw new AppError(401, 'TWO_FACTOR_INVALID_CODE', 'Code 2FA invalide ou expiré')
  }

  await clearTotpFailures(user.id)
  const tokens = await openSession(user.id, { mfa: true, ...context })
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: { id: user.id, username: user.username },
  }
}
