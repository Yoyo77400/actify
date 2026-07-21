import { describe, it, expect, vi } from 'vitest'

// auth.middleware imports services/prisma at module load (needs DATABASE_URL);
// requireTotp itself never touches the DB, so a bare mock is enough.
vi.mock('../services/prisma', () => ({ prisma: {} }))

import type { NextFunction, Request, Response } from 'express'
import { requireTotp } from '../middlewares/auth.middleware'
import { AppError } from '../utils/http'

function run(user: unknown) {
  const req = { user } as unknown as Request
  const next = vi.fn() as unknown as NextFunction
  requireTotp(req, {} as Response, next)
  return next as unknown as ReturnType<typeof vi.fn>
}

// Step-up semantics: the wallet signature is the primary factor; only accounts
// that ENABLED 2FA must present an mfa-validated session on guarded routes.
describe('requireTotp', () => {
  it('passes an account without 2FA enabled (wallet signature is the only factor)', () => {
    const next = run({ id: 'u1', mfa: false, twoFactorEnabled: false })
    expect(next).toHaveBeenCalledWith() // called with no error
  })

  it('passes a 2FA account whose session cleared the 2nd factor (mfa === true)', () => {
    const next = run({ id: 'u1', mfa: true, twoFactorEnabled: true })
    expect(next).toHaveBeenCalledWith()
  })

  it('blocks a 2FA account whose session never validated the 2nd factor', () => {
    const next = run({ id: 'u1', mfa: false, twoFactorEnabled: true })
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(AppError)
    expect(err.status).toBe(403)
    expect(err.code).toBe('TWO_FACTOR_REQUIRED')
  })

  it('blocks when there is no authenticated user at all', () => {
    const next = run(undefined)
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError)
  })
})
