import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt'
import { AppError } from '../utils/http'

vi.mock('../services/prisma', () => ({
  prisma: { session: { findUnique: vi.fn(), update: vi.fn() } },
}))

import { prisma } from '../services/prisma'
import { refreshSession } from '../services/auth.service'

const findUnique = vi.mocked(prisma.session.findUnique)
const update = vi.mocked(prisma.session.update)

const USER_ID = 'user-1'
const SESSION_ID = 'session-1'

// Refresh is decided by the server session, not by the token's own contents:
// that is what makes logout and "revoke this device" actually cut access.
function activeSession(userOverrides: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    userId: USER_ID,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    user: { id: USER_ID, deletedAt: null, isBanned: false, ...userOverrides },
    ...overrides,
  }
}

const refreshToken = (opts: { mfa?: boolean } = {}) => signRefreshToken(USER_ID, { ...opts, sid: SESSION_ID })

describe('refreshSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findUnique.mockResolvedValue(activeSession() as never)
  })

  it('issues a fresh token pair for a valid refresh token', async () => {
    const { accessToken, refreshToken: rotated } = await refreshSession(refreshToken())
    expect(verifyToken(accessToken)?.sub).toBe(USER_ID)
    expect(verifyToken(accessToken)?.type).toBeUndefined()
    // Rotated refresh token: same subject, still marked as refresh.
    expect(verifyToken(rotated)?.sub).toBe(USER_ID)
    expect(verifyToken(rotated)?.type).toBe('refresh')
  })

  it('keeps the rotated pair on the same session so revoking it still kills both', async () => {
    const { accessToken, refreshToken: rotated } = await refreshSession(refreshToken())
    expect(verifyToken(accessToken)?.sid).toBe(SESSION_ID)
    expect(verifyToken(rotated)?.sid).toBe(SESSION_ID)
  })

  it('preserves the mfa level across rotation (2FA session must not downgrade)', async () => {
    const { accessToken, refreshToken: rotated } = await refreshSession(refreshToken({ mfa: true }))
    expect(verifyToken(accessToken)?.mfa).toBe(true)
    expect(verifyToken(rotated)?.mfa).toBe(true)

    // And the absence of mfa stays absent — rotation never grants it.
    const plain = await refreshSession(refreshToken())
    expect(verifyToken(plain.accessToken)?.mfa).toBeUndefined()
  })

  it('rejects an access token used as refresh token', async () => {
    await expect(refreshSession(signAccessToken(USER_ID, { sid: SESSION_ID }))).rejects.toMatchObject(
      new AppError(401, 'AUTH_REQUIRED', 'Refresh token invalide ou expiré'),
    )
    expect(findUnique).not.toHaveBeenCalled()
  })

  // The whole point of the session store: a logged-out token must stop working
  // immediately instead of surviving until its 7-day expiry.
  it('rejects a token whose session was revoked', async () => {
    findUnique.mockResolvedValue(activeSession({}, { revokedAt: new Date() }) as never)
    await expect(refreshSession(refreshToken())).rejects.toMatchObject({ status: 401 })
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects a token whose session has expired', async () => {
    findUnique.mockResolvedValue(activeSession({}, { expiresAt: new Date(Date.now() - 1) }) as never)
    await expect(refreshSession(refreshToken())).rejects.toMatchObject({ status: 401 })
  })

  // Pre-session tokens carry no sid; nothing could revoke them, so they are dead.
  it('rejects a legacy token issued before sessions existed', async () => {
    await expect(refreshSession(signRefreshToken(USER_ID))).rejects.toMatchObject({ status: 401 })
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('rejects when the session is unknown or its user was deleted', async () => {
    findUnique.mockResolvedValue(null)
    await expect(refreshSession(refreshToken())).rejects.toMatchObject({ status: 401 })

    findUnique.mockResolvedValue(activeSession({ deletedAt: new Date() }) as never)
    await expect(refreshSession(refreshToken())).rejects.toMatchObject({ status: 401 })
  })

  it('rejects banned users', async () => {
    findUnique.mockResolvedValue(activeSession({ isBanned: true }) as never)
    await expect(refreshSession(refreshToken())).rejects.toMatchObject({ status: 403, code: 'USER_BANNED' })
  })

  it('rejects missing input', async () => {
    await expect(refreshSession('')).rejects.toMatchObject({ status: 400 })
  })
})
