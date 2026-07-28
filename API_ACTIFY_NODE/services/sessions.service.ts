import { prisma } from './prisma'
import { AppError } from '../utils/http'
import { REFRESH_TOKEN_TTL_MS, signAccessToken, signRefreshToken } from '../utils/jwt'

export interface SessionContext {
  userAgent?: string | null
  ip?: string | null
}

/**
 * Opens a server-side session and returns the token pair bound to it.
 *
 * Tokens carry the session id (`sid`); every authenticated request re-reads the
 * row, so revoking it here cuts access immediately. Without this, a stolen JWT
 * stayed valid for its whole TTL and /auth/logout could only clear cookies
 * client-side.
 */
export async function openSession(userId: string, opts: { mfa?: boolean } & SessionContext = {}) {
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      // Truncated: a User-Agent is attacker-controlled and only used for display.
      userAgent: opts.userAgent?.slice(0, 255) ?? null,
      ip: opts.ip?.slice(0, 64) ?? null,
    },
  })

  return {
    sessionId: session.id,
    accessToken: signAccessToken(userId, { mfa: opts.mfa, sid: session.id }),
    refreshToken: signRefreshToken(userId, { mfa: opts.mfa, sid: session.id }),
  }
}

/** The session behind a token, or null when it is unusable (revoked/expired/gone). */
export async function findUsableSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null
  if (!session.user || session.user.deletedAt) return null
  return session
}

/** Rotation on refresh: same session, new tokens, sliding expiry. */
export async function touchSession(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  })
}

/** Idempotent: logging out twice is not an error. */
export async function revokeSession(sessionId: string) {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return { revoked: true }
}

/**
 * Revokes one of the caller's own sessions. A session belonging to someone else
 * answers 404 rather than 403: a distinct status would confirm that the id
 * exists, letting anyone probe for valid session ids.
 */
export async function revokeUserSession(userId: string, sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session || session.userId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Session introuvable')
  }
  return revokeSession(sessionId)
}

/** Used when the account itself goes away (RGPD erasure) or on a global sign-out. */
export async function revokeAllUserSessions(userId: string) {
  const { count } = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return { revoked: count }
}

export async function listUserSessions(userId: string, currentSessionId?: string) {
  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: 'desc' },
  })

  return sessions.map((session) => ({
    id: session.id,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
    userAgent: session.userAgent,
    ip: session.ip,
    // Lets the UI label "this device" and warn before self-revoking.
    current: session.id === currentSessionId,
  }))
}
