import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt'
import { AppError } from '../utils/http'

vi.mock('../services/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

import { prisma } from '../services/prisma'
import { refreshSession } from '../services/auth.service'

const findUnique = vi.mocked(prisma.user.findUnique)

const activeUser = { id: 'user-1', deletedAt: null, isBanned: false }

describe('refreshSession', () => {
  beforeEach(() => {
    findUnique.mockReset()
  })

  it('issues a fresh token pair for a valid refresh token', async () => {
    findUnique.mockResolvedValue(activeUser as never)
    const { accessToken, refreshToken } = await refreshSession(signRefreshToken('user-1'))
    expect(verifyToken(accessToken)?.sub).toBe('user-1')
    expect(verifyToken(accessToken)?.type).toBeUndefined()
    // Rotated refresh token: same subject, still marked as refresh.
    expect(verifyToken(refreshToken)?.sub).toBe('user-1')
    expect(verifyToken(refreshToken)?.type).toBe('refresh')
  })

  it('preserves the mfa level across rotation (2FA session must not downgrade)', async () => {
    findUnique.mockResolvedValue(activeUser as never)
    const { accessToken, refreshToken } = await refreshSession(signRefreshToken('user-1', { mfa: true }))
    expect(verifyToken(accessToken)?.mfa).toBe(true)
    expect(verifyToken(refreshToken)?.mfa).toBe(true)

    // And the absence of mfa stays absent — rotation never grants it.
    const plain = await refreshSession(signRefreshToken('user-1'))
    expect(verifyToken(plain.accessToken)?.mfa).toBeUndefined()
  })

  it('rejects an access token used as refresh token', async () => {
    await expect(refreshSession(signAccessToken('user-1'))).rejects.toMatchObject(
      new AppError(401, 'AUTH_REQUIRED', 'Refresh token invalide ou expiré'),
    )
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('rejects when the user no longer exists or is deleted', async () => {
    findUnique.mockResolvedValue(null)
    await expect(refreshSession(signRefreshToken('user-1'))).rejects.toMatchObject({ status: 401 })

    findUnique.mockResolvedValue({ ...activeUser, deletedAt: new Date() } as never)
    await expect(refreshSession(signRefreshToken('user-1'))).rejects.toMatchObject({ status: 401 })
  })

  it('rejects banned users', async () => {
    findUnique.mockResolvedValue({ ...activeUser, isBanned: true } as never)
    await expect(refreshSession(signRefreshToken('user-1'))).rejects.toMatchObject({ status: 403, code: 'USER_BANNED' })
  })

  it('rejects missing input', async () => {
    await expect(refreshSession('')).rejects.toMatchObject({ status: 400 })
  })
})
