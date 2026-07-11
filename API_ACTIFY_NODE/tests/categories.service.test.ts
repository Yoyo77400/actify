import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    listing: { findMany: vi.fn(), count: vi.fn() },
    listingCategory: { count: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import {
  createCategory,
  getCategoryBySlug,
  listCategories,
  listCategoryAssets,
  removeCategory,
  updateCategory,
} from '../services/categories.service'

const categoryFindMany = vi.mocked(prisma.category.findMany)
const categoryFindUnique = vi.mocked(prisma.category.findUnique)
const categoryCreate = vi.mocked(prisma.category.create)
const categoryUpdate = vi.mocked(prisma.category.update)
const categoryDelete = vi.mocked(prisma.category.delete)
const listingFindMany = vi.mocked(prisma.listing.findMany)
const listingCount = vi.mocked(prisma.listing.count)
const listingCategoryCount = vi.mocked(prisma.listingCategory.count)

const designCategory = { id: 1, name: 'Design', slug: 'design' }
const designWithCount = { ...designCategory, _count: { listingCategories: 3 } }

const defaultPagination = { page: 1, limit: 20, skip: 0 }

const publishedListing = {
  id: 'listing-1',
  slug: 'ui-kit',
  title: 'UI Kit',
  shortDescription: 'short',
  description: 'desc',
  thumbnailCid: 'cid-1',
  isFree: false,
  price: 10,
  currency: 'XRP',
  distributionMode: 'unlimited',
  maxDownloads: null,
  royaltyPercentage: 10,
  status: 'Published',
  viewsCount: 5,
  salesCount: 2,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  seller: { id: 'user-1', username: 'alice', displayName: 'Alice' },
  listingCategories: [{ category: designCategory }],
  listingTags: [{ tag: { name: 'figma' } }],
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listCategories', () => {
  it('returns all categories ordered by name with their published listing count', async () => {
    categoryFindMany.mockResolvedValue([designWithCount] as never)

    const categories = await listCategories()

    expect(categories).toEqual([{ id: 1, name: 'Design', slug: 'design', listingCount: 3 }])
    expect(categoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { listingCategories: { where: { listing: { status: 'Published', deletedAt: null } } } },
          },
        },
      }),
    )
  })
})

describe('getCategoryBySlug', () => {
  it('returns the serialized category', async () => {
    categoryFindUnique.mockResolvedValue(designWithCount as never)

    const category = await getCategoryBySlug('design')

    expect(category).toEqual({ id: 1, name: 'Design', slug: 'design', listingCount: 3 })
  })

  it('throws 404 NOT_FOUND for an unknown slug', async () => {
    categoryFindUnique.mockResolvedValue(null)

    await expect(getCategoryBySlug('nope')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })
})

describe('listCategoryAssets', () => {
  it('throws 404 NOT_FOUND for an unknown slug without querying listings', async () => {
    categoryFindUnique.mockResolvedValue(null)

    await expect(listCategoryAssets('nope', defaultPagination)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
    expect(listingFindMany).not.toHaveBeenCalled()
  })

  it('returns serialized published listings of the category, newest first, with meta', async () => {
    categoryFindUnique.mockResolvedValue(designCategory as never)
    listingFindMany.mockResolvedValue([publishedListing] as never)
    listingCount.mockResolvedValue(1)

    const { items, meta } = await listCategoryAssets('design', defaultPagination)

    expect(items).toEqual([
      {
        id: 'listing-1',
        slug: 'ui-kit',
        title: 'UI Kit',
        shortDescription: 'short',
        description: 'desc',
        thumbnailCid: 'cid-1',
        isFree: false,
        price: 10,
        currency: 'XRP',
        distributionMode: 'unlimited',
        maxDownloads: null,
        royaltyBps: 1000,
        status: 'Published',
        viewsCount: 5,
        salesCount: 2,
        createdAt: publishedListing.createdAt,
        seller: { id: 'user-1', username: 'alice', displayName: 'Alice' },
        categories: [{ id: 1, name: 'Design', slug: 'design' }],
        tags: ['figma'],
      },
    ])
    expect(meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 })
    expect(listingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'Published', deletedAt: null, listingCategories: { some: { categoryId: 1 } } },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      }),
    )
  })
})

describe('createCategory', () => {
  it('creates the category with a trimmed name and slugified slug', async () => {
    categoryFindUnique.mockResolvedValue(null)
    categoryCreate.mockResolvedValue({ id: 2, name: 'Modèles 3D', slug: 'modeles-3d' } as never)

    const category = await createCategory({ name: '  Modèles 3D  ' })

    expect(category).toEqual({ id: 2, name: 'Modèles 3D', slug: 'modeles-3d' })
    expect(categoryCreate).toHaveBeenCalledWith({ data: { name: 'Modèles 3D', slug: 'modeles-3d' } })
  })

  it('throws 400 VALIDATION_ERROR when the name is missing or too short', async () => {
    await expect(createCategory({ name: '' })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    await expect(createCategory({ name: 'a' })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(categoryCreate).not.toHaveBeenCalled()
  })

  it('throws 400 VALIDATION_ERROR when the name is too long', async () => {
    await expect(createCategory({ name: 'x'.repeat(101) })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })

  it('throws 400 VALIDATION_ERROR when the name slugifies to nothing', async () => {
    await expect(createCategory({ name: '!!!' })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
  })

  it('throws 409 CATEGORY_EXISTS when the slug is already taken', async () => {
    categoryFindUnique.mockResolvedValue(designCategory as never)

    await expect(createCategory({ name: 'Design' })).rejects.toMatchObject({ status: 409, code: 'CATEGORY_EXISTS' })
    expect(categoryCreate).not.toHaveBeenCalled()
  })
})

describe('updateCategory', () => {
  it('throws 404 NOT_FOUND for a non-numeric id without querying', async () => {
    await expect(updateCategory('abc', { name: 'Design' })).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(categoryFindUnique).not.toHaveBeenCalled()
  })

  it('throws 404 NOT_FOUND for an unknown id', async () => {
    categoryFindUnique.mockResolvedValue(null)

    await expect(updateCategory('99', { name: 'Design' })).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('throws 400 VALIDATION_ERROR for an invalid new name', async () => {
    categoryFindUnique.mockResolvedValueOnce(designCategory as never)

    await expect(updateCategory('1', { name: ' ' })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(categoryUpdate).not.toHaveBeenCalled()
  })

  it('throws 409 CATEGORY_EXISTS when the new slug belongs to another category', async () => {
    categoryFindUnique.mockResolvedValueOnce(designCategory as never)
    categoryFindUnique.mockResolvedValueOnce({ id: 2, name: 'Icons', slug: 'icons' } as never)

    await expect(updateCategory('1', { name: 'Icons' })).rejects.toMatchObject({
      status: 409,
      code: 'CATEGORY_EXISTS',
    })
    expect(categoryUpdate).not.toHaveBeenCalled()
  })

  it('renames and re-slugs, allowing a slug collision with itself', async () => {
    categoryFindUnique.mockResolvedValueOnce(designCategory as never)
    categoryFindUnique.mockResolvedValueOnce(designCategory as never)
    categoryUpdate.mockResolvedValue({ id: 1, name: 'DESIGN', slug: 'design' } as never)

    const category = await updateCategory('1', { name: 'DESIGN' })

    expect(category).toEqual({ id: 1, name: 'DESIGN', slug: 'design' })
    expect(categoryUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'DESIGN', slug: 'design' } })
  })
})

describe('removeCategory', () => {
  it('throws 404 NOT_FOUND for an unknown id', async () => {
    categoryFindUnique.mockResolvedValue(null)

    await expect(removeCategory('99')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('throws 409 CATEGORY_IN_USE when listings still reference the category', async () => {
    categoryFindUnique.mockResolvedValue(designCategory as never)
    listingCategoryCount.mockResolvedValue(2)

    await expect(removeCategory('1')).rejects.toMatchObject({ status: 409, code: 'CATEGORY_IN_USE' })
    expect(categoryDelete).not.toHaveBeenCalled()
  })

  it('hard deletes an unused category', async () => {
    categoryFindUnique.mockResolvedValue(designCategory as never)
    listingCategoryCount.mockResolvedValue(0)
    categoryDelete.mockResolvedValue(designCategory as never)

    const result = await removeCategory('1')

    expect(result).toEqual({ id: 1 })
    expect(categoryDelete).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})
