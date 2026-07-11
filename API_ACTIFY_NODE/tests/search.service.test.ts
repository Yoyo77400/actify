import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findMany: vi.fn(), count: vi.fn() },
    user: { findMany: vi.fn(), count: vi.fn() },
    tag: { findMany: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { getSuggestions, search } from '../services/search.service'

const listingFindMany = vi.mocked(prisma.listing.findMany)
const listingCount = vi.mocked(prisma.listing.count)
const userFindMany = vi.mocked(prisma.user.findMany)
const userCount = vi.mocked(prisma.user.count)
const tagFindMany = vi.mocked(prisma.tag.findMany)

const pagination = { page: 1, limit: 20, skip: 0 }

const listingRow = {
  id: 'listing-1',
  slug: 'neon-pack',
  title: 'Neon Pack',
  shortDescription: 'short',
  thumbnailCid: 'cid-1',
  isFree: false,
  price: 10,
  currency: 'SOL',
  viewsCount: 5,
  salesCount: 2,
  createdAt: new Date('2026-07-01'),
  seller: { id: 'user-1', username: 'alice', displayName: 'Alice' },
}

const creatorRow = {
  id: 'user-2',
  username: 'bob',
  displayName: 'Bob',
  bio: null,
  avatarCid: null,
  isVerified: true,
  createdAt: new Date('2026-06-01'),
  role: { name: 'creator' },
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('search', () => {
  it('rejects a missing or blank q', async () => {
    await expect(search({}, pagination)).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    await expect(search({ q: '   ' }, pagination)).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(listingFindMany).not.toHaveBeenCalled()
  })

  it('rejects an unknown type', async () => {
    await expect(search({ q: 'neon', type: 'nfts' }, pagination)).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })

  it('type=assets returns asset cards with meta and skips the creators query', async () => {
    listingFindMany.mockResolvedValue([listingRow] as never)
    listingCount.mockResolvedValue(1)

    const { results, meta } = await search({ q: 'neon', type: 'assets' }, pagination)

    expect(results.assets).toEqual([
      {
        id: 'listing-1',
        slug: 'neon-pack',
        title: 'Neon Pack',
        shortDescription: 'short',
        thumbnailCid: 'cid-1',
        isFree: false,
        price: 10,
        currency: 'SOL',
        viewsCount: 5,
        salesCount: 2,
        createdAt: listingRow.createdAt,
        seller: listingRow.seller,
      },
    ])
    expect(results.creators).toEqual([])
    expect(meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 })
    expect(userFindMany).not.toHaveBeenCalled()

    expect(listingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'Published',
          deletedAt: null,
          OR: [
            { title: { contains: 'neon', mode: 'insensitive' } },
            { description: { contains: 'neon', mode: 'insensitive' } },
          ],
        }),
      }),
    )
  })

  it('type=creators returns public profiles with meta and skips the assets query', async () => {
    userFindMany.mockResolvedValue([creatorRow] as never)
    userCount.mockResolvedValue(3)

    const { results, meta } = await search({ q: 'bo', type: 'creators' }, pagination)

    expect(results.creators).toEqual([
      {
        id: 'user-2',
        username: 'bob',
        displayName: 'Bob',
        bio: null,
        avatarCid: null,
        role: 'creator',
        isVerified: true,
        createdAt: creatorRow.createdAt,
      },
    ])
    expect(results.assets).toEqual([])
    expect(meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 })
    expect(listingFindMany).not.toHaveBeenCalled()

    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          OR: [
            { username: { contains: 'bo', mode: 'insensitive' } },
            { displayName: { contains: 'bo', mode: 'insensitive' } },
          ],
        }),
      }),
    )
  })

  it('type=all (default) returns both lists without meta', async () => {
    listingFindMany.mockResolvedValue([listingRow] as never)
    listingCount.mockResolvedValue(1)
    userFindMany.mockResolvedValue([creatorRow] as never)
    userCount.mockResolvedValue(1)

    const { results, meta } = await search({ q: 'a' }, pagination)

    expect(results.assets).toHaveLength(1)
    expect(results.creators).toHaveLength(1)
    expect(meta).toBeUndefined()
  })
})

describe('getSuggestions', () => {
  it('rejects a missing or blank q', async () => {
    await expect(getSuggestions(undefined)).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    await expect(getSuggestions('  ')).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
  })

  it('returns top titles, tag names and usernames', async () => {
    listingFindMany.mockResolvedValue([{ title: 'Neon Pack' }, { title: 'Neon City' }] as never)
    tagFindMany.mockResolvedValue([{ name: 'neon' }] as never)
    userFindMany.mockResolvedValue([{ username: 'neo' }, { username: null }] as never)

    const result = await getSuggestions('neo')

    expect(result).toEqual({
      titles: ['Neon Pack', 'Neon City'],
      tags: ['neon'],
      usernames: ['neo'],
    })
    expect(listingFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }))
    expect(tagFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }))
    expect(userFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }))
  })
})
