import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../utils/http'

vi.mock('../services/prisma', () => ({
  prisma: {
    consent: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { listMyConsents, revokeConsent, upsertConsent } from '../services/consents.service'

const consentFindMany = vi.mocked(prisma.consent.findMany)
const consentFindUnique = vi.mocked(prisma.consent.findUnique)
const consentUpsert = vi.mocked(prisma.consent.upsert)
const consentUpdate = vi.mocked(prisma.consent.update)

const consentRow = {
  category: 'analytics',
  isGranted: true,
  policyVersion: '1.0',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listMyConsents', () => {
  it('returns my consents ordered by category', async () => {
    consentFindMany.mockResolvedValue([consentRow] as never)

    await expect(listMyConsents('user-1')).resolves.toEqual([
      {
        category: 'analytics',
        isGranted: true,
        policyVersion: '1.0',
        createdAt: consentRow.createdAt,
        updatedAt: consentRow.updatedAt,
      },
    ])
    expect(consentFindMany).toHaveBeenCalledWith({ where: { userId: 'user-1' }, orderBy: { category: 'asc' } })
  })
})

describe('upsertConsent', () => {
  it('records a new consent decision', async () => {
    consentUpsert.mockResolvedValue(consentRow as never)

    const result = await upsertConsent('user-1', { category: 'analytics', isGranted: true, policyVersion: '1.0' })

    expect(result).toMatchObject({ category: 'analytics', isGranted: true, policyVersion: '1.0' })
    expect(consentUpsert).toHaveBeenCalledWith({
      where: { userId_category: { userId: 'user-1', category: 'analytics' } },
      update: { isGranted: true, policyVersion: '1.0' },
      create: { userId: 'user-1', category: 'analytics', isGranted: true, policyVersion: '1.0' },
    })
  })

  it('rejects a missing category', async () => {
    await expect(upsertConsent('user-1', { isGranted: true })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    expect(consentUpsert).not.toHaveBeenCalled()
  })

  it('rejects a non-boolean isGranted', async () => {
    await expect(upsertConsent('user-1', { category: 'analytics', isGranted: 'yes' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })
})

describe('revokeConsent', () => {
  it('flips an existing consent to not granted', async () => {
    consentFindUnique.mockResolvedValue(consentRow as never)
    consentUpdate.mockResolvedValue({ ...consentRow, isGranted: false } as never)

    const result = await revokeConsent('user-1', 'analytics')

    expect(result.isGranted).toBe(false)
    expect(consentUpdate).toHaveBeenCalledWith({
      where: { userId_category: { userId: 'user-1', category: 'analytics' } },
      data: { isGranted: false },
    })
  })

  it('returns 404 when no consent exists for that category', async () => {
    consentFindUnique.mockResolvedValue(null)
    await expect(revokeConsent('user-1', 'analytics')).rejects.toMatchObject(
      new AppError(404, 'NOT_FOUND', 'Consentement introuvable'),
    )
    expect(consentUpdate).not.toHaveBeenCalled()
  })
})
