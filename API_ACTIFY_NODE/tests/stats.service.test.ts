import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { count: vi.fn(), findMany: vi.fn() },
    user: { count: vi.fn(), findMany: vi.fn() },
    purchase: { aggregate: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { getMarketplaceStats, getTopCreators, getTrendingAssets } from '../services/stats.service'

const listingCount = vi.mocked(prisma.listing.count)
const listingFindMany = vi.mocked(prisma.listing.findMany)
const userCount = vi.mocked(prisma.user.count)
const userFindMany = vi.mocked(prisma.user.findMany)
const purchaseAggregate = vi.mocked(prisma.purchase.aggregate)
const purchaseCount = vi.mocked(prisma.purchase.count)
const purchaseGroupBy = vi.mocked(prisma.purchase.groupBy)

function cardRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    slug: `slug-${id}`,
    title: `Title ${id}`,
    shortDescription: null,
    thumbnailCid: null,
    isFree: false,
    price: 1,
    currency: 'SOL',
    viewsCount: 0,
    salesCount: 0,
    createdAt: new Date('2026-07-01'),
    seller: { id: 'user-1', username: 'alice', displayName: null },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getMarketplaceStats', () => {
  it('aggregates published assets, active users and confirmed sales volume', async () => {
    listingCount.mockResolvedValue(12)
    userCount.mockResolvedValue(34)
    purchaseAggregate.mockResolvedValue({ _sum: { amountPaid: '55.5' } } as never)
    purchaseCount.mockResolvedValue(7)

    await expect(getMarketplaceStats()).resolves.toEqual({
      totalAssets: 12,
      totalUsers: 34,
      totalVolume: 55.5,
      totalSales: 7,
    })
    expect(listingCount).toHaveBeenCalledWith({ where: { status: 'Published', deletedAt: null } })
    expect(purchaseAggregate).toHaveBeenCalledWith({ where: { status: 'Confirmed' }, _sum: { amountPaid: true } })
  })

  it('returns 0 volume when there is no confirmed purchase', async () => {
    listingCount.mockResolvedValue(0)
    userCount.mockResolvedValue(0)
    purchaseAggregate.mockResolvedValue({ _sum: { amountPaid: null } } as never)
    purchaseCount.mockResolvedValue(0)

    await expect(getMarketplaceStats()).resolves.toMatchObject({ totalVolume: 0 })
  })
})

describe('getTrendingAssets', () => {
  it('ranks by confirmed sales over the last 7 days, then fills with most viewed', async () => {
    purchaseGroupBy.mockResolvedValue([
      { listingId: 'l1', _count: { _all: 2 } },
      { listingId: 'l2', _count: { _all: 5 } },
    ] as never)
    listingFindMany
      .mockResolvedValueOnce([cardRow('l1'), cardRow('l2')] as never)
      .mockResolvedValueOnce([cardRow('l3')] as never)

    const cards = await getTrendingAssets()

    expect(cards.map((card) => card.id)).toEqual(['l2', 'l1', 'l3'])
    expect(listingFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ id: { notIn: ['l2', 'l1'] } }),
        orderBy: { viewsCount: 'desc' },
        take: 8,
      }),
    )
  })

  it('falls back entirely to most viewed when there are no recent sales', async () => {
    purchaseGroupBy.mockResolvedValue([] as never)
    listingFindMany.mockResolvedValue([cardRow('l1'), cardRow('l2')] as never)

    const cards = await getTrendingAssets()

    expect(cards.map((card) => card.id)).toEqual(['l1', 'l2'])
    expect(listingFindMany).toHaveBeenCalledTimes(1)
    expect(listingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { viewsCount: 'desc' }, take: 10 }),
    )
  })

  it('skips recently sold listings that are no longer published', async () => {
    purchaseGroupBy.mockResolvedValue([{ listingId: 'l1', _count: { _all: 3 } }] as never)
    listingFindMany.mockResolvedValueOnce([] as never).mockResolvedValueOnce([cardRow('l2')] as never)

    const cards = await getTrendingAssets()

    expect(cards.map((card) => card.id)).toEqual(['l2'])
  })
})

describe('getTopCreators', () => {
  it('returns an empty list when nothing was sold', async () => {
    purchaseGroupBy.mockResolvedValue([] as never)

    await expect(getTopCreators()).resolves.toEqual([])
    expect(listingFindMany).not.toHaveBeenCalled()
  })

  it('sums confirmed revenue per seller and sorts descending', async () => {
    purchaseGroupBy.mockResolvedValue([
      { listingId: 'l1', _sum: { amountPaid: '10' }, _count: { _all: 2 } },
      { listingId: 'l2', _sum: { amountPaid: '30' }, _count: { _all: 1 } },
      { listingId: 'l3', _sum: { amountPaid: '5' }, _count: { _all: 1 } },
    ] as never)
    listingFindMany.mockResolvedValue([
      { id: 'l1', sellerId: 'u1' },
      { id: 'l2', sellerId: 'u2' },
      { id: 'l3', sellerId: 'u1' },
    ] as never)
    userFindMany.mockResolvedValue([
      { id: 'u1', username: 'alice', displayName: null, avatarCid: null },
      { id: 'u2', username: 'bob', displayName: 'Bob', avatarCid: 'cid-2' },
    ] as never)

    await expect(getTopCreators()).resolves.toEqual([
      { id: 'u2', username: 'bob', displayName: 'Bob', avatarCid: 'cid-2', revenue: 30, salesCount: 1 },
      { id: 'u1', username: 'alice', displayName: null, avatarCid: null, revenue: 15, salesCount: 3 },
    ])
  })

  it('drops sellers whose account was deleted', async () => {
    purchaseGroupBy.mockResolvedValue([
      { listingId: 'l1', _sum: { amountPaid: '10' }, _count: { _all: 1 } },
      { listingId: 'l2', _sum: { amountPaid: '30' }, _count: { _all: 1 } },
    ] as never)
    listingFindMany.mockResolvedValue([
      { id: 'l1', sellerId: 'u1' },
      { id: 'l2', sellerId: 'u2' },
    ] as never)
    // u2 is soft-deleted: the deletedAt filter keeps it out of the user fetch.
    userFindMany.mockResolvedValue([{ id: 'u1', username: 'alice', displayName: null, avatarCid: null }] as never)

    const creators = await getTopCreators()

    expect(creators.map((creator) => creator.id)).toEqual(['u1'])
  })
})
