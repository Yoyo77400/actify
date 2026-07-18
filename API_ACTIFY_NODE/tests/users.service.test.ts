import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../utils/http'

vi.mock('../services/prisma', () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    listing: { findMany: vi.fn(), count: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { listUserAssets } from '../services/users.service'

const userFindFirst = vi.mocked(prisma.user.findFirst)
const listingFindMany = vi.mocked(prisma.listing.findMany)
const listingCount = vi.mocked(prisma.listing.count)

const activeUser = { id: 'user-1', username: 'alice', deletedAt: null, role: { name: 'user' } }
const pagination = { page: 1, limit: 20, skip: 0 }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listUserAssets', () => {
  it('only exposes published, non-deleted listings of the user', async () => {
    userFindFirst.mockResolvedValue(activeUser as never)
    listingFindMany.mockResolvedValue([] as never)
    listingCount.mockResolvedValue(0)

    await listUserAssets('alice', pagination)

    expect(listingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sellerId: 'user-1', status: 'Published', deletedAt: null } }),
    )
  })

  it('never selects fileIpfsCid: the storage key of the paid file must not leak publicly', async () => {
    userFindFirst.mockResolvedValue(activeUser as never)
    listingFindMany.mockResolvedValue([] as never)
    listingCount.mockResolvedValue(0)

    await listUserAssets('alice', pagination)

    // A raw findMany (no select) would return every column, including the key
    // that GET /files/:key streams without any entitlement check.
    const select = listingFindMany.mock.calls[0]?.[0]?.select
    expect(select).toBeDefined()
    expect(select).not.toHaveProperty('fileIpfsCid')
    expect(select).not.toHaveProperty('sellerId')
  })

  it('rejects with 404 for an unknown or deleted username', async () => {
    userFindFirst.mockResolvedValue(null)

    await expect(listUserAssets('ghost', pagination)).rejects.toMatchObject(
      new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable'),
    )
    expect(listingFindMany).not.toHaveBeenCalled()
  })
})
