import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authenticator } from '@otplib/preset-v11'
import { AppError } from '../utils/http'
import { generateTotpSecret } from '../utils/totp'

vi.mock('../services/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,FAKE') },
}))

import { prisma } from '../services/prisma'
import { setupTwoFactor, confirmTwoFactor } from '../services/two-factor.service'

const userFindUnique = vi.mocked(prisma.user.findUnique)
const userUpdate = vi.mocked(prisma.user.update)

const USER_ID = 'user-1'
const baseUser = {
  id: USER_ID,
  username: 'alice',
  email: null,
  deletedAt: null,
  twoFactorSecret: null as string | null,
  twoFactorEnabled: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  userUpdate.mockResolvedValue({} as never)
})

describe('setupTwoFactor', () => {
  it('stores a secret (without enabling) and returns a QR code', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser } as never)

    const result = await setupTwoFactor(USER_ID)

    expect(result.qrCode).toBe('data:image/png;base64,FAKE')
    expect(result.secret).toEqual(expect.any(String))
    expect(result.otpauthUri).toContain('otpauth://totp/')
    // Secret persisted, enabled left untouched (confirmation comes later).
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { twoFactorSecret: result.secret },
    })
  })

  it('refuses to re-enroll when 2FA is already enabled', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser, twoFactorEnabled: true } as never)
    await expect(setupTwoFactor(USER_ID)).rejects.toThrow(AppError)
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('throws when the user does not exist', async () => {
    userFindUnique.mockResolvedValue(null as never)
    await expect(setupTwoFactor(USER_ID)).rejects.toThrow(AppError)
  })
})

describe('confirmTwoFactor', () => {
  it('enables 2FA when the code matches the pending secret', async () => {
    const secret = generateTotpSecret()
    userFindUnique.mockResolvedValue({ ...baseUser, twoFactorSecret: secret } as never)
    const code = authenticator.generate(secret)

    const result = await confirmTwoFactor(USER_ID, code)

    expect(result).toEqual({ enabled: true })
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { twoFactorEnabled: true },
    })
  })

  it('rejects an incorrect code and does not enable', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser, twoFactorSecret: generateTotpSecret() } as never)
    await expect(confirmTwoFactor(USER_ID, '000000')).rejects.toThrow(AppError)
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('rejects when no enrollment is in progress', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser, twoFactorSecret: null } as never)
    await expect(confirmTwoFactor(USER_ID, '000000')).rejects.toThrow(AppError)
  })

  it('requires a code', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser, twoFactorSecret: generateTotpSecret() } as never)
    await expect(confirmTwoFactor(USER_ID, '')).rejects.toThrow(AppError)
  })
})
