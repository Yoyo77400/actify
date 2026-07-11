import jwt from 'jsonwebtoken'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set — load your .env before importing this module')
}

const JWT_SECRET = process.env.JWT_SECRET
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '30d'

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
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
