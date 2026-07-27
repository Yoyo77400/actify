import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    collection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    listing: { findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../services/prisma'
import {
  assertAssignableCollection,
  createCollection,
  deleteCollection,
  updateCollection,
} from '../services/collections.service'

const findUnique = vi.mocked(prisma.collection.findUnique)
const create = vi.mocked(prisma.collection.create)
const update = vi.mocked(prisma.collection.update)

const OWNER = 'user-1'
const owned = { id: 7, name: 'Neon', slug: 'neon', img: null, ownerId: OWNER }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createCollection', () => {
  it('rejects a name that is too short or too long', async () => {
    await expect(createCollection(OWNER, { name: 'a' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    await expect(createCollection(OWNER, { name: 'x'.repeat(101) })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })

  it('refuses a name whose slug is already taken', async () => {
    findUnique.mockResolvedValue({ ...owned, id: 99 } as never)

    await expect(createCollection(OWNER, { name: 'Neon' })).rejects.toMatchObject({
      status: 409,
      code: 'COLLECTION_EXISTS',
    })
  })

  it('stores the caller as the owner', async () => {
    findUnique.mockResolvedValue(null as never)
    create.mockResolvedValue({ ...owned, _count: { listings: 0 } } as never)

    const result = await createCollection(OWNER, { name: 'Neon Dreams' })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ownerId: OWNER }) }),
    )
    expect(result).toMatchObject({ slug: 'neon', listingCount: 0 })
  })
})

// Ownership is what owner_id was added for — these guard the whole point.
describe('ownership', () => {
  it('hides someone else\'s collection behind a 404 on update', async () => {
    findUnique.mockResolvedValue({ ...owned, ownerId: 'someone-else' } as never)

    await expect(updateCollection(OWNER, 7, { name: 'Hijacked' })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses to delete a collection the caller does not own', async () => {
    findUnique.mockResolvedValue({ ...owned, ownerId: 'someone-else' } as never)

    await expect(deleteCollection(OWNER, 7)).rejects.toMatchObject({ status: 404 })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('refuses to attach an asset to a collection the caller does not own', async () => {
    findUnique.mockResolvedValue({ ...owned, ownerId: 'someone-else' } as never)

    await expect(assertAssignableCollection(OWNER, 7)).rejects.toMatchObject({ status: 404 })
  })

  it('allows detaching an asset without any ownership lookup', async () => {
    await expect(assertAssignableCollection(OWNER, null)).resolves.toBeNull()
    expect(findUnique).not.toHaveBeenCalled()
  })
})

describe('deleteCollection', () => {
  it('detaches the listings instead of deleting them', async () => {
    findUnique.mockResolvedValue(owned as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

    await deleteCollection(OWNER, 7)

    // The grouping disappears; the published assets inside it must survive.
    expect(prisma.listing.updateMany).toHaveBeenCalledWith({
      where: { collectionId: 7 },
      data: { collectionId: null },
    })
    expect(prisma.collection.delete).toHaveBeenCalledWith({ where: { id: 7 } })
  })
})
