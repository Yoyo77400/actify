import jwt from 'jsonwebtoken'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set — load your .env before importing this module')
}

const JWT_SECRET = process.env.JWT_SECRET
const ACCESS_TOKEN_TTL = '15m'
// Kept short while refresh tokens are stateless (no server-side revocation):
// a leaked token stays usable for the full TTL. Revisit with the session store.
const REFRESH_TOKEN_TTL = '7d'
// Jeton intermédiaire entre la vérification wallet et la saisie du code TOTP :
// il ne prouve que le premier facteur, d'où une durée de vie très courte.
const PENDING_TOTP_TTL = '5m'

// mfa:true est posé une fois le second facteur (TOTP) validé — requireTotp
// s'appuie dessus pour garder les routes sensibles. Sans 2FA, pas de claim.
export function signAccessToken(userId: string, opts: { mfa?: boolean } = {}): string {
  return jwt.sign({ sub: userId, ...(opts.mfa ? { mfa: true } : {}) }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
}

// Émis quand un compte 2FA vient de passer le premier facteur : il n'ouvre
// aucune route protégée (type '2fa' rejeté par le middleware d'auth), il ne
// sert qu'à /auth/verify-2fa pour échanger le code contre un vrai jeton.
export function signPendingTotpToken(userId: string): string {
  return jwt.sign({ sub: userId, type: '2fa' }, JWT_SECRET, { expiresIn: PENDING_TOTP_TTL })
}

// Stateless for now (no session store yet) — /auth/refresh will consume this
// once the sessions/Auth2 work lands. No server-side revocation until then.
export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL })
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
