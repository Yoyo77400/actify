import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn(), groupBy: vi.fn() },
    user: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    purchase: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    role: { findFirst: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import {
  forceDeleteAsset,
  getAdminStats,
  getUserDetail,
  listAllAssets,
  listOrders,
  listUsers,
  setUserBanStatus,
  updateAssetStatus,
  updateUserRole,
} from '../services/admin.service'

const listingFindMany = vi.mocked(prisma.listing.findMany)
const listingCount = vi.mocked(prisma.listing.count)
const listingFindUnique = vi.mocked(prisma.listing.findUnique)
const listingUpdate = vi.mocked(prisma.listing.update)
const listingGroupBy = vi.mocked(prisma.listing.groupBy)
const userFindMany = vi.mocked(prisma.user.findMany)
const userCount = vi.mocked(prisma.user.count)
const userFindUnique = vi.mocked(prisma.user.findUnique)
const userUpdate = vi.mocked(prisma.user.update)
const purchaseFindMany = vi.mocked(prisma.purchase.findMany)
const purchaseCount = vi.mocked(prisma.purchase.count)
const purchaseAggregate = vi.mocked(prisma.purchase.aggregate)
const roleFindFirst = vi.mocked(prisma.role.findFirst)

const pagination = { page: 1, limit: 20, skip: 0 }

const listingRow = {
  id: 'l1',
  slug: 'neon-pack',
  title: 'Neon Pack',
  isFree: false,
  price: 10,
  currency: 'SOL',
  status: 'Suspended',
  viewsCount: 5,
  salesCount: 2,
  createdAt: new Date('2026-07-01'),
  deletedAt: null,
  seller: { id: 'u1', username: 'alice', displayName: null },
}

const userRow = {
  id: 'u1',
  username: 'alice',
  displayName: null,
  email: 'alice@example.com',
  avatarCid: null,
  isVerified: false,
  isBanned: false,
  createdAt: new Date('2026-06-01'),
  deletedAt: null,
  role: { id: 1, name: 'user' },
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listAllAssets', () => {
  it('lists every asset (any status, deleted included) with filters applied', async () => {
    listingFindMany.mockResolvedValue([listingRow] as never)
    listingCount.mockResolvedValue(1)

    const { items, meta } = await listAllAssets({ status: 'Suspended', sellerId: 'u1' }, pagination)

    expect(items).toEqual([
      {
        id: 'l1',
        slug: 'neon-pack',
        title: 'Neon Pack',
        isFree: false,
        price: 10,
        currency: 'SOL',
        status: 'Suspended',
        viewsCount: 5,
        salesCount: 2,
        createdAt: listingRow.createdAt,
        deletedAt: null,
        seller: listingRow.seller,
      },
    ])
    expect(meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 })
    expect(listingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'Suspended', sellerId: 'u1' } }),
    )
  })

  it('applies no implicit filter without query params', async () => {
    listingFindMany.mockResolvedValue([] as never)
    listingCount.mockResolvedValue(0)

    await listAllAssets({}, pagination)

    expect(listingFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }))
  })
})

describe('updateAssetStatus', () => {
  it('rejects a status outside the allowed set', async () => {
    await expect(updateAssetStatus('l1', 'Deleted')).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    expect(listingFindUnique).not.toHaveBeenCalled()
  })

  it('throws 404 for an unknown asset', async () => {
    listingFindUnique.mockResolvedValue(null)
    await expect(updateAssetStatus('nope', 'Suspended')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('updates the status', async () => {
    listingFindUnique.mockResolvedValue({ id: 'l1' } as never)
    listingUpdate.mockResolvedValue({ id: 'l1', status: 'Suspended' } as never)

    await expect(updateAssetStatus('l1', 'Suspended')).resolves.toEqual({ id: 'l1', status: 'Suspended' })
    expect(listingUpdate).toHaveBeenCalledWith({ where: { id: 'l1' }, data: { status: 'Suspended' } })
  })
})

describe('forceDeleteAsset', () => {
  it('throws 404 for an unknown asset', async () => {
    listingFindUnique.mockResolvedValue(null)
    await expect(forceDeleteAsset('nope')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('soft deletes and archives the asset', async () => {
    const deletedAt = new Date('2026-07-11')
    listingFindUnique.mockResolvedValue({ id: 'l1' } as never)
    listingUpdate.mockResolvedValue({ id: 'l1', status: 'Archived', deletedAt } as never)

    await expect(forceDeleteAsset('l1')).resolves.toEqual({ id: 'l1', status: 'Archived', deletedAt })
    expect(listingUpdate).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { deletedAt: expect.any(Date), status: 'Archived' },
    })
  })
})

describe('listUsers', () => {
  it('serializes users with a flattened role name', async () => {
    userFindMany.mockResolvedValue([userRow] as never)
    userCount.mockResolvedValue(1)

    const { items, meta } = await listUsers({}, pagination)

    expect(items).toEqual([
      {
        id: 'u1',
        username: 'alice',
        displayName: null,
        email: 'alice@example.com',
        avatarCid: null,
        role: 'user',
        isVerified: false,
        isBanned: false,
        createdAt: userRow.createdAt,
        deletedAt: null,
      },
    ])
    expect(meta.total).toBe(1)
  })

  it('builds the where clause from q, banned and role filters', async () => {
    userFindMany.mockResolvedValue([] as never)
    userCount.mockResolvedValue(0)

    await listUsers({ q: 'ali', banned: false, role: 'creator' }, pagination)

    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { username: { contains: 'ali', mode: 'insensitive' } },
            { email: { contains: 'ali', mode: 'insensitive' } },
          ],
          isBanned: false,
          role: { name: 'creator' },
        },
      }),
    )
  })
})

describe('getUserDetail', () => {
  it('throws 404 for an unknown user', async () => {
    userFindUnique.mockResolvedValue(null)
    await expect(getUserDetail('nope')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('returns the full profile with wallets and activity counts', async () => {
    const wallets = [{ id: 'w1', address: 'addr', chain: 'solana', label: null, isPrimary: true }]
    userFindUnique.mockResolvedValue({ ...userRow, bio: 'hello', wallets } as never)
    listingCount.mockResolvedValue(3)
    purchaseCount.mockResolvedValue(2)

    await expect(getUserDetail('u1')).resolves.toMatchObject({
      id: 'u1',
      email: 'alice@example.com',
      role: 'user',
      bio: 'hello',
      wallets,
      stats: { listingsCount: 3, purchasesCount: 2 },
    })
  })
})

describe('setUserBanStatus', () => {
  it('throws 404 for an unknown user', async () => {
    userFindUnique.mockResolvedValue(null)
    await expect(setUserBanStatus('nope', true)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('refuses to ban an admin', async () => {
    userFindUnique.mockResolvedValue({ ...userRow, role: { id: 3, name: 'admin' } } as never)
    await expect(setUserBanStatus('u1', true)).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('bans a regular user', async () => {
    userFindUnique.mockResolvedValue(userRow as never)
    userUpdate.mockResolvedValue({ id: 'u1', isBanned: true } as never)

    await expect(setUserBanStatus('u1', true)).resolves.toEqual({ id: 'u1', isBanned: true })
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { isBanned: true } })
  })

  it('allows unbanning even for an admin account', async () => {
    userFindUnique.mockResolvedValue({ ...userRow, role: { id: 3, name: 'admin' }, isBanned: true } as never)
    userUpdate.mockResolvedValue({ id: 'u1', isBanned: false } as never)

    await expect(setUserBanStatus('u1', false)).resolves.toEqual({ id: 'u1', isBanned: false })
  })
})

describe('updateUserRole', () => {
  it('rejects a missing role name', async () => {
    await expect(updateUserRole('admin-1', 'u1', '')).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(roleFindFirst).not.toHaveBeenCalled()
  })

  it('throws 404 when the role name is not seeded', async () => {
    roleFindFirst.mockResolvedValue(null)
    await expect(updateUserRole('admin-1', 'u1', 'superadmin')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('throws 404 for an unknown user', async () => {
    roleFindFirst.mockResolvedValue({ id: 2, name: 'creator' } as never)
    userFindUnique.mockResolvedValue(null)
    await expect(updateUserRole('admin-1', 'nope', 'creator')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('refuses an admin demoting themselves', async () => {
    roleFindFirst.mockResolvedValue({ id: 2, name: 'creator' } as never)
    userFindUnique.mockResolvedValue({ ...userRow, id: 'admin-1', role: { id: 3, name: 'admin' } } as never)

    await expect(updateUserRole('admin-1', 'admin-1', 'creator')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    })
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('refuses to demote the last remaining admin', async () => {
    roleFindFirst.mockResolvedValue({ id: 2, name: 'creator' } as never)
    userFindUnique.mockResolvedValue({ ...userRow, id: 'u2', role: { id: 3, name: 'admin' } } as never)
    userCount.mockResolvedValue(1)

    await expect(updateUserRole('admin-1', 'u2', 'creator')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    })
    expect(userCount).toHaveBeenCalledWith({ where: { role: { name: 'admin' }, deletedAt: null } })
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('updates the user role', async () => {
    roleFindFirst.mockResolvedValue({ id: 2, name: 'creator' } as never)
    userFindUnique.mockResolvedValue(userRow as never)
    userUpdate.mockResolvedValue({ ...userRow, role: { id: 2, name: 'creator' } } as never)

    await expect(updateUserRole('admin-1', 'u1', 'creator')).resolves.toEqual({ id: 'u1', role: 'creator' })
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' }, data: { roleId: 2 } }),
    )
  })
})

describe('listOrders', () => {
  it('lists purchases with buyer/listing summaries and a numeric amount', async () => {
    const purchasedAt = new Date('2026-07-10')
    purchaseFindMany.mockResolvedValue([
      {
        id: 'p1',
        buyer: { id: 'u1', username: 'alice', displayName: null },
        listing: { id: 'l1', title: 'Neon Pack', slug: 'neon-pack' },
        txHash: '0xabc',
        amountPaid: '12.5',
        status: 'Confirmed',
        purchasedAt,
      },
    ] as never)
    purchaseCount.mockResolvedValue(1)

    const { items, meta } = await listOrders({ status: 'Confirmed' }, pagination)

    expect(items).toEqual([
      {
        id: 'p1',
        buyer: { id: 'u1', username: 'alice', displayName: null },
        listing: { id: 'l1', title: 'Neon Pack', slug: 'neon-pack' },
        txHash: '0xabc',
        amountPaid: 12.5,
        status: 'Confirmed',
        purchasedAt,
      },
    ])
    expect(meta.total).toBe(1)
    expect(purchaseFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'Confirmed' } }))
  })

  it('masks the internal pending:<uuid> placeholder as null', async () => {
    purchaseFindMany.mockResolvedValue([
      {
        id: 'p2',
        buyer: { id: 'u1', username: 'alice', displayName: null },
        listing: { id: 'l1', title: 'Neon Pack', slug: 'neon-pack' },
        txHash: 'pending:00000000-0000-0000-0000-000000000000',
        amountPaid: '5',
        status: 'Pending',
        purchasedAt: new Date('2026-07-10'),
      },
    ] as never)
    purchaseCount.mockResolvedValue(1)

    const { items } = await listOrders({}, pagination)
    expect(items[0]!.txHash).toBeNull()
  })
})

describe('getAdminStats', () => {
  it('aggregates platform totals and asset counts by status', async () => {
    userCount.mockResolvedValueOnce(20).mockResolvedValueOnce(3)
    listingCount.mockResolvedValue(15)
    listingGroupBy.mockResolvedValue([
      { status: 'Published', _count: { _all: 10 } },
      { status: 'Draft', _count: { _all: 4 } },
      { status: 'Suspended', _count: { _all: 1 } },
    ] as never)
    purchaseCount.mockResolvedValue(40)
    purchaseAggregate.mockResolvedValue({ _sum: { amountPaid: '123.45' } } as never)

    await expect(getAdminStats()).resolves.toEqual({
      totalUsers: 20,
      bannedUsers: 3,
      totalAssets: 15,
      // Archived is absent from the groupBy result and must default to 0.
      byStatus: { Draft: 4, Published: 10, Archived: 0, Suspended: 1 },
      totalOrders: 40,
      confirmedRevenue: 123.45,
    })
  })
})
