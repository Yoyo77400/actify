import { prisma } from './prisma'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'

const PUBLISHED = 'Published'
const CONFIRMED = 'Confirmed'
const MIN_RATING = 1
const MAX_RATING = 5

const REVIEWER_INCLUDE = {
  reviewer: { select: { id: true, username: true, displayName: true, avatarCid: true } },
} as const

export interface CreateReviewInput {
  assetId: string
  rating: number
  comment?: string | null
}

export interface UpdateReviewInput {
  rating?: number
  comment?: string | null
}

export interface ReviewListFilters {
  rating?: number
  sort?: string
  order?: 'asc' | 'desc'
}

interface ReviewWithReviewer {
  id: string
  listingId: string
  rating: number
  comment: string | null
  createdAt: Date
  reviewer: {
    id: string
    username: string | null
    displayName: string | null
    avatarCid: string | null
  }
}

function serializeReview(review: ReviewWithReviewer) {
  return {
    id: review.id,
    assetId: review.listingId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    reviewer: {
      id: review.reviewer.id,
      username: review.reviewer.username,
      displayName: review.reviewer.displayName,
      avatarCid: review.reviewer.avatarCid,
    },
  }
}

function validateRating(rating: unknown): number {
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    throw new AppError(400, 'VALIDATION_ERROR', `rating doit être un entier entre ${MIN_RATING} et ${MAX_RATING}`)
  }
  return rating
}

// Reviews only exist on listings a visitor could actually see: published and
// not soft-deleted. Anything else gets the same 404 as a missing asset.
async function getPublishedListingOrThrow(listingId: string) {
  const listing = await prisma.listing.findFirst({ where: { id: listingId, deletedAt: null } })
  if (!listing || listing.status !== PUBLISHED) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }
  return listing
}

// Not-owner gets the same 404 as not-exists so review ids cannot be probed.
async function getOwnedReviewOrThrow(userId: string, reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } })
  if (!review || review.reviewerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Avis introuvable')
  }
  return review
}

export async function createReview(userId: string, input: CreateReviewInput) {
  if (!input.assetId || typeof input.assetId !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'assetId est requis')
  }
  const rating = validateRating(input.rating)

  await getPublishedListingOrThrow(input.assetId)

  const confirmedPurchase = await prisma.purchase.findFirst({
    where: { listingId: input.assetId, buyerId: userId, status: CONFIRMED },
  })
  if (!confirmedPurchase) {
    throw new AppError(403, 'FORBIDDEN', 'Achat vérifié requis pour laisser un avis')
  }

  const existing = await prisma.review.findFirst({ where: { listingId: input.assetId, reviewerId: userId } })
  if (existing) {
    throw new AppError(409, 'DUPLICATE_REVIEW', 'Vous avez déjà laissé un avis sur cet asset')
  }

  const created = await prisma.review.create({
    data: {
      listingId: input.assetId,
      reviewerId: userId,
      rating,
      comment: input.comment ?? null,
    },
    include: REVIEWER_INCLUDE,
  })

  return serializeReview(created)
}

export async function updateReview(userId: string, reviewId: string, input: UpdateReviewInput) {
  await getOwnedReviewOrThrow(userId, reviewId)

  const data: Record<string, unknown> = {}
  if (input.rating !== undefined) data.rating = validateRating(input.rating)
  if (input.comment !== undefined) data.comment = input.comment

  const updated = await prisma.review.update({ where: { id: reviewId }, data, include: REVIEWER_INCLUDE })
  return serializeReview(updated)
}

export async function deleteReview(userId: string, reviewId: string) {
  await getOwnedReviewOrThrow(userId, reviewId)
  await prisma.review.delete({ where: { id: reviewId } })
  return { id: reviewId }
}

const SORTABLE_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  rating: 'rating',
}

export async function listAssetReviews(assetId: string, filters: ReviewListFilters, pagination: Pagination) {
  const where: Record<string, unknown> = { listingId: assetId }
  if (filters.rating !== undefined) {
    where.rating = validateRating(filters.rating)
  }

  await getPublishedListingOrThrow(assetId)

  const orderByField = SORTABLE_FIELDS[filters.sort ?? 'createdAt'] ?? 'createdAt'
  const order = filters.order === 'asc' ? 'asc' : 'desc'

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: REVIEWER_INCLUDE,
      orderBy: { [orderByField]: order },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.review.count({ where }),
  ])

  return { items: items.map(serializeReview), meta: buildMeta(pagination.page, pagination.limit, total) }
}
