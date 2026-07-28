import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../utils/http'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    favorite: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { addFavorite, listMyFavorites, removeFavorite } from '../services/favorites.service'

const listingFindFirst = vi.mocked(prisma.listing.findFirst)
const listingFindMany = vi.mocked(prisma.listing.findMany)
const listingCount = vi.mocked(prisma.listing.count)
const favoriteUpsert = vi.mocked(prisma.favorite.upsert)
const favoriteDeleteMany = vi.mocked(prisma.favorite.deleteMany)

const publishedListing = { id: 'listing-1', status: 'Published', deletedAt: null }
const pagination = { page: 1, limit: 20, skip: 0 }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('addFavorite', () => {
  it('favorites a published listing and returns { favorited: true }', async () => {
    listingFindFirst.mockResolvedValue(publishedListing as never)
    favoriteUpsert.mockResolvedValue({} as never)

    await expect(addFavorite('user-1', 'listing-1')).resolves.toEqual({ favorited: true })

    // Soft-deleted listings must be excluded at the query level.
    expect(listingFindFirst).toHaveBeenCalledWith({ where: { id: 'listing-1', deletedAt: null } })
    expect(favoriteUpsert).toHaveBeenCalledWith({
      where: { userId_listingId: { userId: 'user-1', listingId: 'listing-1' } },
      update: {},
      create: { userId: 'user-1', listingId: 'listing-1' },
    })
  })

  it('is idempotent: re-favoriting resolves to the same state without error', async () => {
    listingFindFirst.mockResolvedValue(publishedListing as never)
    favoriteUpsert.mockResolvedValue({ userId: 'user-1', listingId: 'listing-1' } as never)

    await expect(addFavorite('user-1', 'listing-1')).resolves.toEqual({ favorited: true })
  })

  it('rejects with 404 when the listing does not exist or is deleted', async () => {
    listingFindFirst.mockResolvedValue(null)

    await expect(addFavorite('user-1', 'missing')).rejects.toMatchObject(
      new AppError(404, 'NOT_FOUND', 'Asset introuvable'),
    )
    expect(favoriteUpsert).not.toHaveBeenCalled()
  })

  it('rejects with 404 when the listing is not published', async () => {
    listingFindFirst.mockResolvedValue({ ...publishedListing, status: 'Draft' } as never)

    await expect(addFavorite('user-1', 'listing-1')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(favoriteUpsert).not.toHaveBeenCalled()
  })
})

describe('removeFavorite', () => {
  it('removes the favorite and returns { favorited: false }', async () => {
    favoriteDeleteMany.mockResolvedValue({ count: 1 } as never)

    await expect(removeFavorite('user-1', 'listing-1')).resolves.toEqual({ favorited: false })
    expect(favoriteDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', listingId: 'listing-1' } })
  })

  it('is idempotent: removing a non-favorite still returns { favorited: false }', async () => {
    favoriteDeleteMany.mockResolvedValue({ count: 0 } as never)

    await expect(removeFavorite('user-1', 'listing-1')).resolves.toEqual({ favorited: false })
  })
})

describe('listMyFavorites', () => {
  // Full shape expected by assets.service's serializeListing (shared via queryListings).
  const listingRow = {
    id: 'listing-1',
    slug: 'ui-kit',
    title: 'UI Kit',
    shortDescription: 'Un kit UI complet',
    description: null,
    thumbnailCid: 'cid-thumb',
    isFree: false,
    price: 10,
    currency: 'XRP',
    distributionMode: 'unlimited',
    maxDownloads: null,
    royaltyPercentage: null,
    status: 'Published',
    viewsCount: 0,
    salesCount: 0,
    fileIpfsCid: null,
    nft: null,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    seller: { id: 'seller-1', username: 'alice', displayName: 'Alice' },
    listingCategories: [],
    listingTags: [],
    _count: { purchases: 0 },
  }

  it('lists only this user\'s favorited, published listings, using the shared card serializer', async () => {
    listingFindMany.mockResolvedValue([listingRow] as never)
    listingCount.mockResolvedValue(1)

    const { items, meta } = await listMyFavorites('user-1', {}, pagination)

    expect(items).toEqual([expect.objectContaining({ id: 'listing-1', title: 'UI Kit', currency: 'XRP' })])
    expect(meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 })

    const expectedWhere = { status: 'Published', deletedAt: null, favorites: { some: { userId: 'user-1' } } }
    expect(listingFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }))
    expect(listingCount).toHaveBeenCalledWith({ where: expectedWhere })
  })

  it('returns an empty page with a zero total when nothing is favorited', async () => {
    listingFindMany.mockResolvedValue([] as never)
    listingCount.mockResolvedValue(0)

    const { items, meta } = await listMyFavorites('user-1', {}, pagination)

    expect(items).toEqual([])
    expect(meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 })
  })

  it('applies the requested pagination window', async () => {
    listingFindMany.mockResolvedValue([] as never)
    listingCount.mockResolvedValue(45)

    const { meta } = await listMyFavorites('user-1', {}, { page: 3, limit: 10, skip: 20 })

    expect(listingFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }))
    expect(meta).toEqual({ page: 3, limit: 10, total: 45, totalPages: 5 })
  })

  it('applies search/filter params (e.g. isFree) on top of the favorites scope', async () => {
    listingFindMany.mockResolvedValue([] as never)
    listingCount.mockResolvedValue(0)

    await listMyFavorites('user-1', { isFree: true }, pagination)

    expect(listingFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'Published', deletedAt: null, favorites: { some: { userId: 'user-1' } }, isFree: true },
    }))
  })
})
