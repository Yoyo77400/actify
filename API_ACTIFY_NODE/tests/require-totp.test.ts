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

describe('requireTotp', () => {
  it('passes when the session cleared the 2nd factor (mfa === true)', () => {
    const next = run({ id: 'u1', mfa: true })
    expect(next).toHaveBeenCalledWith() // called with no error
  })

  it('blocks with 403 TWO_FACTOR_REQUIRED when mfa is false', () => {
    const next = run({ id: 'u1', mfa: false })
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
