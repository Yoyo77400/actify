import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../utils/http'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findFirst: vi.fn() },
    favorite: { upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { addFavorite, listMyFavorites, removeFavorite } from '../services/favorites.service'

const listingFindFirst = vi.mocked(prisma.listing.findFirst)
const favoriteUpsert = vi.mocked(prisma.favorite.upsert)
const favoriteDeleteMany = vi.mocked(prisma.favorite.deleteMany)
const favoriteFindMany = vi.mocked(prisma.favorite.findMany)
const favoriteCount = vi.mocked(prisma.favorite.count)

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
  const addedAt = new Date('2026-01-02T00:00:00.000Z')
  const listing = {
    id: 'listing-1',
    slug: 'ui-kit',
    title: 'UI Kit',
    shortDescription: 'Un kit UI complet',
    description: 'internal-only field that must not leak',
    thumbnailCid: 'cid-thumb',
    isFree: false,
    price: 10,
    currency: 'EUR',
    status: 'Published',
  }

  it('returns public card fields plus addedAt, newest first, published only', async () => {
    favoriteFindMany.mockResolvedValue([{ userId: 'user-1', listingId: 'listing-1', addedAt, listing }] as never)
    favoriteCount.mockResolvedValue(1)

    const { items, meta } = await listMyFavorites('user-1', pagination)

    expect(items).toEqual([
      {
        id: 'listing-1',
        slug: 'ui-kit',
        title: 'UI Kit',
        shortDescription: 'Un kit UI complet',
        thumbnailCid: 'cid-thumb',
        isFree: false,
        price: 10,
        currency: 'EUR',
        status: 'Published',
        addedAt,
      },
    ])
    expect(meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 })

    const expectedWhere = { userId: 'user-1', listing: { status: 'Published', deletedAt: null } }
    expect(favoriteFindMany).toHaveBeenCalledWith({
      where: expectedWhere,
      include: { listing: true },
      orderBy: { addedAt: 'desc' },
      skip: 0,
      take: 20,
    })
    expect(favoriteCount).toHaveBeenCalledWith({ where: expectedWhere })
  })

  it('returns an empty page with a zero total when nothing is favorited', async () => {
    favoriteFindMany.mockResolvedValue([] as never)
    favoriteCount.mockResolvedValue(0)

    const { items, meta } = await listMyFavorites('user-1', pagination)

    expect(items).toEqual([])
    expect(meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 })
  })

  it('applies the requested pagination window', async () => {
    favoriteFindMany.mockResolvedValue([] as never)
    favoriteCount.mockResolvedValue(45)

    const { meta } = await listMyFavorites('user-1', { page: 3, limit: 10, skip: 20 })

    expect(favoriteFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }))
    expect(meta).toEqual({ page: 3, limit: 10, total: 45, totalPages: 5 })
  })
})
