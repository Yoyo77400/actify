import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../utils/http'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findFirst: vi.fn() },
    review: { findUnique: vi.fn() },
    report: { create: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { createReport, listReportReasons } from '../services/reports.service'

const listingFindFirst = vi.mocked(prisma.listing.findFirst)
const reviewFindUnique = vi.mocked(prisma.review.findUnique)
const reportCreate = vi.mocked(prisma.report.create)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listReportReasons', () => {
  it('returns the fixed list of reasons with a description each', () => {
    const reasons = listReportReasons()
    expect(reasons.map((r) => r.value)).toEqual(['copyright', 'inappropriate', 'spam', 'scam', 'other'])
    for (const reason of reasons) {
      expect(reason.description.length).toBeGreaterThan(0)
    }
  })
})

describe('createReport', () => {
  const createdReport = {
    id: 'report-1',
    targetType: 'asset',
    targetId: 'listing-1',
    reason: 'copyright',
    details: 'Contenu déjà publié ailleurs',
    status: 'Pending',
    resolutionNote: null,
    resolvedAt: null,
    createdAt: new Date('2026-07-20T00:00:00.000Z'),
  }

  it('reports an existing asset', async () => {
    listingFindFirst.mockResolvedValue({ id: 'listing-1', deletedAt: null } as never)
    reportCreate.mockResolvedValue(createdReport as never)

    const result = await createReport('user-1', {
      targetType: 'asset',
      targetId: 'listing-1',
      reason: 'copyright',
      details: 'Contenu déjà publié ailleurs',
    })

    expect(result).toEqual({
      id: 'report-1',
      targetType: 'asset',
      targetId: 'listing-1',
      reason: 'copyright',
      details: 'Contenu déjà publié ailleurs',
      status: 'Pending',
      resolutionNote: null,
      resolvedAt: null,
      createdAt: createdReport.createdAt,
    })
    expect(listingFindFirst).toHaveBeenCalledWith({ where: { id: 'listing-1', deletedAt: null } })
    expect(reportCreate).toHaveBeenCalledWith({
      data: {
        reporterId: 'user-1',
        targetType: 'asset',
        targetId: 'listing-1',
        reason: 'copyright',
        details: 'Contenu déjà publié ailleurs',
        status: 'Pending',
      },
    })
  })

  it('reports an existing review without checking listings', async () => {
    reviewFindUnique.mockResolvedValue({ id: 'review-1' } as never)
    reportCreate.mockResolvedValue({ ...createdReport, targetType: 'review', targetId: 'review-1' } as never)

    await createReport('user-1', { targetType: 'review', targetId: 'review-1', reason: 'spam' })

    expect(reviewFindUnique).toHaveBeenCalledWith({ where: { id: 'review-1' } })
    expect(listingFindFirst).not.toHaveBeenCalled()
  })

  it('rejects an invalid targetType', async () => {
    await expect(
      createReport('user-1', { targetType: 'user', targetId: 'x', reason: 'spam' }),
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(reportCreate).not.toHaveBeenCalled()
  })

  it('rejects a missing targetId', async () => {
    await expect(
      createReport('user-1', { targetType: 'asset', reason: 'spam' }),
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
  })

  it('rejects an invalid reason', async () => {
    await expect(
      createReport('user-1', { targetType: 'asset', targetId: 'listing-1', reason: 'because' }),
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(listingFindFirst).not.toHaveBeenCalled()
  })

  it('rejects a non-existent asset with 404', async () => {
    listingFindFirst.mockResolvedValue(null)
    await expect(
      createReport('user-1', { targetType: 'asset', targetId: 'missing', reason: 'spam' }),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(reportCreate).not.toHaveBeenCalled()
  })

  it('rejects a non-existent review with 404', async () => {
    reviewFindUnique.mockResolvedValue(null)
    await expect(
      createReport('user-1', { targetType: 'review', targetId: 'missing', reason: 'spam' }),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })
})
