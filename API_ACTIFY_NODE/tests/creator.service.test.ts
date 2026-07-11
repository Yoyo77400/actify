import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findMany: vi.fn(), findFirst: vi.fn() },
    purchase: { groupBy: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
    download: { count: vi.fn() },
    favorite: { count: vi.fn() },
    review: { aggregate: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { getCreatorAssetStats, getCreatorRevenue, getCreatorStats } from '../services/creator.service'

const listingFindMany = vi.mocked(prisma.listing.findMany)
const listingFindFirst = vi.mocked(prisma.listing.findFirst)
const purchaseGroupBy = vi.mocked(prisma.purchase.groupBy)
const purchaseAggregate = vi.mocked(prisma.purchase.aggregate)
const purchaseFindMany = vi.mocked(prisma.purchase.findMany)
const downloadCount = vi.mocked(prisma.download.count)
const favoriteCount = vi.mocked(prisma.favorite.count)
const reviewAggregate = vi.mocked(prisma.review.aggregate)

const DAY_MS = 24 * 60 * 60 * 1000

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getCreatorStats', () => {
  it('aggregates revenue, sales, views and ranks the top 5 assets by revenue', async () => {
    listingFindMany.mockResolvedValue([
      { id: 'l1', title: 'One', viewsCount: 1 },
      { id: 'l2', title: 'Two', viewsCount: 2 },
      { id: 'l3', title: 'Three', viewsCount: 3 },
      { id: 'l4', title: 'Four', viewsCount: 4 },
      { id: 'l5', title: 'Five', viewsCount: 5 },
      { id: 'l6', title: 'Six', viewsCount: 6 },
    ] as never)
    purchaseGroupBy.mockResolvedValue([
      { listingId: 'l1', _sum: { amountPaid: '5' }, _count: { _all: 1 } },
      { listingId: 'l2', _sum: { amountPaid: '50' }, _count: { _all: 2 } },
      { listingId: 'l5', _sum: { amountPaid: '20' }, _count: { _all: 1 } },
    ] as never)

    const stats = await getCreatorStats('user-1')

    expect(stats).toMatchObject({ revenue: 75, salesCount: 4, totalViews: 21, assetsCount: 6 })
    expect(stats.topAssets).toHaveLength(5)
    expect(stats.topAssets.slice(0, 3)).toEqual([
      { id: 'l2', title: 'Two', revenue: 50, salesCount: 2 },
      { id: 'l5', title: 'Five', revenue: 20, salesCount: 1 },
      { id: 'l1', title: 'One', revenue: 5, salesCount: 1 },
    ])
    expect(purchaseGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'Confirmed', listing: { sellerId: 'user-1' } } }),
    )
  })

  it('returns zeroed stats when the creator never sold anything', async () => {
    listingFindMany.mockResolvedValue([{ id: 'l1', title: 'One', viewsCount: 7 }] as never)
    purchaseGroupBy.mockResolvedValue([] as never)

    await expect(getCreatorStats('user-1')).resolves.toEqual({
      revenue: 0,
      salesCount: 0,
      totalViews: 7,
      assetsCount: 1,
      topAssets: [{ id: 'l1', title: 'One', revenue: 0, salesCount: 0 }],
    })
  })
})

describe('getCreatorAssetStats', () => {
  it('throws 404 for an unknown asset', async () => {
    listingFindFirst.mockResolvedValue(null)
    await expect(getCreatorAssetStats('user-1', 'nope')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it("throws the same 404 for another seller's asset", async () => {
    listingFindFirst.mockResolvedValue({ id: 'l1', sellerId: 'someone-else', viewsCount: 9 } as never)
    await expect(getCreatorAssetStats('user-1', 'l1')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(purchaseAggregate).not.toHaveBeenCalled()
  })

  it('returns detailed stats for an owned asset', async () => {
    listingFindFirst.mockResolvedValue({ id: 'l1', sellerId: 'user-1', viewsCount: 9 } as never)
    purchaseAggregate.mockResolvedValue({ _sum: { amountPaid: '42' }, _count: { _all: 3 } } as never)
    downloadCount.mockResolvedValue(5)
    favoriteCount.mockResolvedValue(4)
    reviewAggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { _all: 2 } } as never)

    await expect(getCreatorAssetStats('user-1', 'l1')).resolves.toEqual({
      views: 9,
      salesCount: 3,
      revenue: 42,
      downloadsCount: 5,
      favoritesCount: 4,
      reviewsCount: 2,
      averageRating: 4.5,
    })
  })

  it('handles an asset with no sales and no reviews', async () => {
    listingFindFirst.mockResolvedValue({ id: 'l1', sellerId: 'user-1', viewsCount: 0 } as never)
    purchaseAggregate.mockResolvedValue({ _sum: { amountPaid: null }, _count: { _all: 0 } } as never)
    downloadCount.mockResolvedValue(0)
    favoriteCount.mockResolvedValue(0)
    reviewAggregate.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } } as never)

    await expect(getCreatorAssetStats('user-1', 'l1')).resolves.toMatchObject({
      revenue: 0,
      averageRating: null,
    })
  })
})

describe('getCreatorRevenue', () => {
  it('rejects an unknown period', async () => {
    await expect(getCreatorRevenue('user-1', { period: 'year' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })

  it('rejects invalid from/to dates', async () => {
    await expect(getCreatorRevenue('user-1', { from: 'not-a-date' })).rejects.toMatchObject({ status: 400 })
    await expect(getCreatorRevenue('user-1', { to: 'not-a-date' })).rejects.toMatchObject({ status: 400 })
  })

  it('groups confirmed purchases by day', async () => {
    purchaseFindMany.mockResolvedValue([
      { amountPaid: '10', purchasedAt: new Date('2026-07-01T10:00:00Z') },
      { amountPaid: '5', purchasedAt: new Date('2026-07-01T12:00:00Z') },
      { amountPaid: '2', purchasedAt: new Date('2026-07-03T00:00:00Z') },
    ] as never)

    await expect(
      getCreatorRevenue('user-1', { period: 'day', from: '2026-07-01', to: '2026-07-05' }),
    ).resolves.toEqual([
      { period: '2026-07-01', revenue: 15, salesCount: 2 },
      { period: '2026-07-03', revenue: 2, salesCount: 1 },
    ])
    expect(purchaseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'Confirmed', listing: { sellerId: 'user-1' } }),
      }),
    )
  })

  it('groups by ISO week keyed on the Monday', async () => {
    // 2026-07-01 is a Wednesday; its week starts Monday 2026-06-29.
    purchaseFindMany.mockResolvedValue([
      { amountPaid: '10', purchasedAt: new Date('2026-07-01T00:00:00Z') },
      { amountPaid: '5', purchasedAt: new Date('2026-07-03T00:00:00Z') },
      { amountPaid: '1', purchasedAt: new Date('2026-07-06T00:00:00Z') },
    ] as never)

    await expect(
      getCreatorRevenue('user-1', { period: 'week', from: '2026-06-29', to: '2026-07-07' }),
    ).resolves.toEqual([
      { period: '2026-06-29', revenue: 15, salesCount: 2 },
      { period: '2026-07-06', revenue: 1, salesCount: 1 },
    ])
  })

  it('groups by month', async () => {
    purchaseFindMany.mockResolvedValue([
      { amountPaid: '10', purchasedAt: new Date('2026-06-15T00:00:00Z') },
      { amountPaid: '5', purchasedAt: new Date('2026-07-01T00:00:00Z') },
    ] as never)

    await expect(
      getCreatorRevenue('user-1', { period: 'month', from: '2026-06-01', to: '2026-07-31' }),
    ).resolves.toEqual([
      { period: '2026-06', revenue: 10, salesCount: 1 },
      { period: '2026-07', revenue: 5, salesCount: 1 },
    ])
  })

  it('defaults to day buckets over the last 30 days', async () => {
    purchaseFindMany.mockResolvedValue([] as never)

    await expect(getCreatorRevenue('user-1', {})).resolves.toEqual([])

    const args = purchaseFindMany.mock.calls[0][0] as {
      where: { purchasedAt: { gte: Date; lte: Date } }
    }
    expect(args.where.purchasedAt.lte).toBeInstanceOf(Date)
    expect(args.where.purchasedAt.lte.getTime() - args.where.purchasedAt.gte.getTime()).toBe(30 * DAY_MS)
  })
})
