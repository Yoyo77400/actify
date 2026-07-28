import jwt from 'jsonwebtoken'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set — load your .env before importing this module')
}

const JWT_SECRET = process.env.JWT_SECRET
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '7d'
/** Same 7 days, in ms — the session row's expiry must match the refresh token's. */
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
// Jeton intermédiaire (1er facteur seul) : durée de vie très courte.
const PENDING_TOTP_TTL = '5m'

// mfa:true est posé une fois le 2e facteur validé — requireTotp s'appuie dessus.
// `sid` lie le jeton à une session serveur révocable (sessions.service) : sans
// lui, le jeton n'ouvre plus rien.
export function signAccessToken(userId: string, opts: { mfa?: boolean; sid?: string } = {}): string {
  return jwt.sign(
    { sub: userId, ...(opts.mfa ? { mfa: true } : {}), ...(opts.sid ? { sid: opts.sid } : {}) },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  )
}

// N'ouvre aucune route (type '2fa' rejeté par le middleware) : sert uniquement
// à /auth/verify-2fa pour échanger le code contre un vrai jeton.
export function signPendingTotpToken(userId: string): string {
  return jwt.sign({ sub: userId, type: '2fa' }, JWT_SECRET, { expiresIn: PENDING_TOTP_TTL })
}

// Carries mfa: token rotation must not downgrade a 2FA-validated session
// (requireTotp would re-lock the account 15 minutes after login otherwise).
export function signRefreshToken(userId: string, opts: { mfa?: boolean; sid?: string } = {}): string {
  return jwt.sign(
    { sub: userId, type: 'refresh', ...(opts.mfa ? { mfa: true } : {}), ...(opts.sid ? { sid: opts.sid } : {}) },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL },
  )
}

export function verifyToken(token: string): jwt.JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
  } catch {
    return null
  }
}

export function extractBearerToken(header: string | undefined): string | null {
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}
