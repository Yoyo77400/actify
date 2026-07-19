import { authenticator } from '@otplib/preset-v11'

// Frontière cryptographique pure du TOTP (RFC 6238) : aucune dépendance à
// Prisma ni Express, donc testable seule. Le reste du 2FA (stockage du secret,
// activation, gating des routes) s'appuie dessus.

const ISSUER = 'Actify'

// Clé secrète unique de l'utilisateur, encodée en Base32 (scannable par
// Google/Microsoft Authenticator). Générée côté serveur à l'enrôlement.
export function generateTotpSecret(): string {
  return authenticator.generateSecret()
}

// URI otpauth:// standardisée que toutes les apps d'authentification savent
// décoder ; c'est ce contenu que le frontend transforme en QR code.
export function buildOtpauthUri(accountName: string, secret: string): string {
  return authenticator.keyuri(accountName, ISSUER, secret)
}

// Rejoue l'algorithme TOTP avec le secret + l'heure courante et compare au code
// à 6 chiffres saisi. otplib tolère la dérive d'horloge (fenêtre C-1/C+1).
export function verifyTotp(code: string, secret: string): boolean {
  try {
    return authenticator.check(code, secret)
  } catch {
    // otplib jette si le secret est malformé : on traite ça comme un échec.
    return false
  }
}
