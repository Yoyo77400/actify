import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../utils/http'

vi.mock('../services/prisma', () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    follow: { upsert: vi.fn(), deleteMany: vi.fn() },
    listing: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { followUser, listFollowedFeed, unfollowUser } from '../services/follows.service'

const userFindFirst = vi.mocked(prisma.user.findFirst)
const followUpsert = vi.mocked(prisma.follow.upsert)
const followDeleteMany = vi.mocked(prisma.follow.deleteMany)
const listingFindMany = vi.mocked(prisma.listing.findMany)
const listingCount = vi.mocked(prisma.listing.count)

const targetUser = { id: 'artist-1', username: 'alice', deletedAt: null }
const pagination = { page: 1, limit: 20, skip: 0 }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('followUser', () => {
  it('follows an existing active user and returns { following: true }', async () => {
    userFindFirst.mockResolvedValue(targetUser as never)
    followUpsert.mockResolvedValue({} as never)

    await expect(followUser('user-1', 'alice')).resolves.toEqual({ following: true })

    expect(userFindFirst).toHaveBeenCalledWith({ where: { username: 'alice', deletedAt: null } })
    expect(followUpsert).toHaveBeenCalledWith({
      where: { followerId_followingId: { followerId: 'user-1', followingId: 'artist-1' } },
      update: {},
      create: { followerId: 'user-1', followingId: 'artist-1' },
    })
  })

  it('is idempotent: following twice resolves to the same state without error', async () => {
    userFindFirst.mockResolvedValue(targetUser as never)
    followUpsert.mockResolvedValue({} as never)

    await expect(followUser('user-1', 'alice')).resolves.toEqual({ following: true })
    await expect(followUser('user-1', 'alice')).resolves.toEqual({ following: true })
  })

  it('rejects with 404 when the target user does not exist or is deleted', async () => {
    userFindFirst.mockResolvedValue(null)

    await expect(followUser('user-1', 'missing')).rejects.toMatchObject(
      new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable'),
    )
    expect(followUpsert).not.toHaveBeenCalled()
  })

  it('rejects self-follow with a validation error', async () => {
    userFindFirst.mockResolvedValue({ ...targetUser, id: 'user-1' } as never)

    await expect(followUser('user-1', 'alice')).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(followUpsert).not.toHaveBeenCalled()
  })
})

describe('unfollowUser', () => {
  it('removes the follow and returns { following: false }', async () => {
    userFindFirst.mockResolvedValue(targetUser as never)
    followDeleteMany.mockResolvedValue({ count: 1 } as never)

    await expect(unfollowUser('user-1', 'alice')).resolves.toEqual({ following: false })
    expect(followDeleteMany).toHaveBeenCalledWith({ where: { followerId: 'user-1', followingId: 'artist-1' } })
  })

  it('is idempotent: unfollowing a non-follow still returns { following: false }', async () => {
    userFindFirst.mockResolvedValue(targetUser as never)
    followDeleteMany.mockResolvedValue({ count: 0 } as never)

    await expect(unfollowUser('user-1', 'alice')).resolves.toEqual({ following: false })
  })

  it('rejects with 404 when the target user does not exist', async () => {
    userFindFirst.mockResolvedValue(null)

    await expect(unfollowUser('user-1', 'missing')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(followDeleteMany).not.toHaveBeenCalled()
  })
})

describe('listFollowedFeed', () => {
  const listingRow = {
    id: 'listing-1',
    slug: 'ui-kit',
    title: 'UI Kit',
    shortDescription: null,
    description: null,
    thumbnailCid: 'cid-thumb',
    isFree: false,
    price: 10,
    currency: 'XRP',
    distributionMode: 'unlimited',
    maxDownloads: null,
    royaltyPercentage: null,
    collectionId: null,
    status: 'Published',
    viewsCount: 0,
    salesCount: 0,
    fileIpfsCid: null,
    nft: null,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    seller: { id: 'artist-1', username: 'alice', displayName: 'Alice' },
    listingCategories: [],
    listingTags: [],
    _count: { purchases: 0 },
  }

  it("lists published listings from creators this user follows, using the shared card serializer", async () => {
    listingFindMany.mockResolvedValue([listingRow] as never)
    listingCount.mockResolvedValue(1)

    const { items, meta } = await listFollowedFeed('user-1', {}, pagination)

    expect(items).toEqual([expect.objectContaining({ id: 'listing-1', title: 'UI Kit' })])
    expect(meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 })

    const expectedWhere = {
      status: 'Published',
      deletedAt: null,
      seller: { followers: { some: { followerId: 'user-1' } } },
    }
    expect(listingFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }))
    expect(listingCount).toHaveBeenCalledWith({ where: expectedWhere })
  })

  it('returns an empty page with a zero total when following nobody (or nobody has published)', async () => {
    listingFindMany.mockResolvedValue([] as never)
    listingCount.mockResolvedValue(0)

    const { items, meta } = await listFollowedFeed('user-1', {}, pagination)

    expect(items).toEqual([])
    expect(meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 })
  })
})
