import { authenticator } from '@otplib/preset-v11'

// TOTP (RFC 6238) isolé d'Express/Prisma pour rester testable seul.
const ISSUER = 'Actify'

export function generateTotpSecret(): string {
  return authenticator.generateSecret()
}

// URI otpauth:// que les apps d'authentification transforment en QR code.
export function buildOtpauthUri(accountName: string, secret: string): string {
  return authenticator.keyuri(accountName, ISSUER, secret)
}

export function verifyTotp(code: string, secret: string): boolean {
  try {
    return authenticator.check(code, secret)
  } catch {
    return false // secret malformé
  }
}
