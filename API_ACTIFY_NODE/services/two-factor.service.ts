import QRCode from 'qrcode'
import { prisma } from './prisma'
import { AppError } from '../utils/http'
import { generateTotpSecret, buildOtpauthUri, verifyTotp } from '../utils/totp'

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
