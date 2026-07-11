import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findFirst: vi.fn() },
    purchase: { findFirst: vi.fn() },
    review: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../services/prisma'
import { createReview, deleteReview, listAssetReviews, updateReview } from '../services/reviews.service'

const listingFindFirst = vi.mocked(prisma.listing.findFirst)
const purchaseFindFirst = vi.mocked(prisma.purchase.findFirst)
const reviewFindFirst = vi.mocked(prisma.review.findFirst)
const reviewFindUnique = vi.mocked(prisma.review.findUnique)
const reviewCreate = vi.mocked(prisma.review.create)
const reviewUpdate = vi.mocked(prisma.review.update)
const reviewDelete = vi.mocked(prisma.review.delete)
const reviewFindMany = vi.mocked(prisma.review.findMany)
const reviewCount = vi.mocked(prisma.review.count)

const publishedListing = { id: 'listing-1', status: 'Published', deletedAt: null }
const confirmedPurchase = { id: 'purchase-1', status: 'Confirmed' }
const reviewer = { id: 'user-1', username: 'alice', displayName: 'Alice', avatarCid: null }
const fullReview = {
  id: 'review-1',
  listingId: 'listing-1',
  reviewerId: 'user-1',
  rating: 5,
  comment: 'Très bon asset',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  reviewer,
}
const serializedReview = {
  id: 'review-1',
  assetId: 'listing-1',
  rating: 5,
  comment: 'Très bon asset',
  createdAt: fullReview.createdAt,
  reviewer: { id: 'user-1', username: 'alice', displayName: 'Alice', avatarCid: null },
}
const pagination = { page: 1, limit: 20, skip: 0 }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('createReview', () => {
  it('creates a review after a confirmed purchase', async () => {
    listingFindFirst.mockResolvedValue(publishedListing as never)
    purchaseFindFirst.mockResolvedValue(confirmedPurchase as never)
    reviewFindFirst.mockResolvedValue(null)
    reviewCreate.mockResolvedValue(fullReview as never)

    const result = await createReview('user-1', { assetId: 'listing-1', rating: 5, comment: 'Très bon asset' })

    expect(result).toEqual(serializedReview)
    expect(purchaseFindFirst).toHaveBeenCalledWith({
      where: { listingId: 'listing-1', buyerId: 'user-1', status: 'Confirmed' },
    })
    expect(reviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { listingId: 'listing-1', reviewerId: 'user-1', rating: 5, comment: 'Très bon asset' },
      }),
    )
  })

  it('rejects a missing assetId', async () => {
    await expect(createReview('user-1', { assetId: '', rating: 5 })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    expect(listingFindFirst).not.toHaveBeenCalled()
  })

  it('rejects a non-integer or out-of-range rating', async () => {
    for (const rating of [0, 6, 4.5, undefined]) {
      await expect(createReview('user-1', { assetId: 'listing-1', rating: rating as never })).rejects.toMatchObject({
        status: 400,
        code: 'VALIDATION_ERROR',
      })
    }
    expect(listingFindFirst).not.toHaveBeenCalled()
  })

  it('returns 404 when the listing does not exist or is deleted', async () => {
    listingFindFirst.mockResolvedValue(null)
    await expect(createReview('user-1', { assetId: 'listing-1', rating: 5 })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
  })

  it('returns 404 when the listing is not published', async () => {
    listingFindFirst.mockResolvedValue({ ...publishedListing, status: 'Draft' } as never)
    await expect(createReview('user-1', { assetId: 'listing-1', rating: 5 })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
  })

  it('returns 403 when the reviewer has no confirmed purchase', async () => {
    listingFindFirst.mockResolvedValue(publishedListing as never)
    purchaseFindFirst.mockResolvedValue(null)
    await expect(createReview('user-1', { assetId: 'listing-1', rating: 5 })).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Achat vérifié requis pour laisser un avis',
    })
  })

  it('returns 409 when the user already reviewed the asset', async () => {
    listingFindFirst.mockResolvedValue(publishedListing as never)
    purchaseFindFirst.mockResolvedValue(confirmedPurchase as never)
    reviewFindFirst.mockResolvedValue(fullReview as never)
    await expect(createReview('user-1', { assetId: 'listing-1', rating: 4 })).rejects.toMatchObject({
      status: 409,
      code: 'DUPLICATE_REVIEW',
    })
    expect(reviewCreate).not.toHaveBeenCalled()
  })
})

describe('updateReview', () => {
  it('updates rating and comment for the owner', async () => {
    reviewFindUnique.mockResolvedValue(fullReview as never)
    reviewUpdate.mockResolvedValue({ ...fullReview, rating: 3, comment: 'Mis à jour' } as never)

    const result = await updateReview('user-1', 'review-1', { rating: 3, comment: 'Mis à jour' })

    expect(result).toEqual({ ...serializedReview, rating: 3, comment: 'Mis à jour' })
    expect(reviewUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'review-1' }, data: { rating: 3, comment: 'Mis à jour' } }),
    )
  })

  it('returns 404 when the review does not exist', async () => {
    reviewFindUnique.mockResolvedValue(null)
    await expect(updateReview('user-1', 'review-1', { rating: 3 })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
  })

  it('returns the same 404 when the caller is not the owner', async () => {
    reviewFindUnique.mockResolvedValue({ ...fullReview, reviewerId: 'user-2' } as never)
    await expect(updateReview('user-1', 'review-1', { rating: 3 })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
    expect(reviewUpdate).not.toHaveBeenCalled()
  })

  it('rejects an invalid rating', async () => {
    reviewFindUnique.mockResolvedValue(fullReview as never)
    await expect(updateReview('user-1', 'review-1', { rating: 6 })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    expect(reviewUpdate).not.toHaveBeenCalled()
  })
})

describe('deleteReview', () => {
  it('deletes the review for the owner', async () => {
    reviewFindUnique.mockResolvedValue(fullReview as never)
    reviewDelete.mockResolvedValue(fullReview as never)

    const result = await deleteReview('user-1', 'review-1')

    expect(result).toEqual({ id: 'review-1' })
    expect(reviewDelete).toHaveBeenCalledWith({ where: { id: 'review-1' } })
  })

  it('returns the same 404 when missing or not owner', async () => {
    reviewFindUnique.mockResolvedValue(null)
    await expect(deleteReview('user-1', 'review-1')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })

    reviewFindUnique.mockResolvedValue({ ...fullReview, reviewerId: 'user-2' } as never)
    await expect(deleteReview('user-1', 'review-1')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })

    expect(reviewDelete).not.toHaveBeenCalled()
  })
})

describe('listAssetReviews', () => {
  it('lists reviews of a published asset with default sort', async () => {
    listingFindFirst.mockResolvedValue(publishedListing as never)
    reviewFindMany.mockResolvedValue([fullReview] as never)
    reviewCount.mockResolvedValue(1)

    const { items, meta } = await listAssetReviews('listing-1', {}, pagination)

    expect(items).toEqual([serializedReview])
    expect(meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 })
    expect(reviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { listingId: 'listing-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      }),
    )
  })

  it('filters by rating and sorts by rating asc', async () => {
    listingFindFirst.mockResolvedValue(publishedListing as never)
    reviewFindMany.mockResolvedValue([] as never)
    reviewCount.mockResolvedValue(0)

    await listAssetReviews('listing-1', { rating: 4, sort: 'rating', order: 'asc' }, pagination)

    expect(reviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { listingId: 'listing-1', rating: 4 },
        orderBy: { rating: 'asc' },
      }),
    )
  })

  it('rejects an out-of-range rating filter', async () => {
    await expect(listAssetReviews('listing-1', { rating: 9 }, pagination)).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    expect(listingFindFirst).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown or unpublished asset', async () => {
    listingFindFirst.mockResolvedValue(null)
    await expect(listAssetReviews('listing-1', {}, pagination)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
    expect(reviewFindMany).not.toHaveBeenCalled()
  })
})
