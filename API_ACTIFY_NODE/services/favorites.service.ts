import { prisma } from './prisma'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'

const PUBLISHED = 'Published'

export async function addFavorite(userId: string, listingId: string) {
  const listing = await prisma.listing.findFirst({ where: { id: listingId, deletedAt: null } })
  if (!listing || listing.status !== PUBLISHED) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }

  // Upsert keeps the operation idempotent: re-favoriting is a no-op that
  // preserves the original addedAt instead of failing on the composite id.
  await prisma.favorite.upsert({
    where: { userId_listingId: { userId, listingId } },
    update: {},
    create: { userId, listingId },
  })

  return { favorited: true }
}

export async function removeFavorite(userId: string, listingId: string) {
  // deleteMany instead of delete: removing a non-favorite must be a no-op,
  // not a Prisma "record not found" error.
  await prisma.favorite.deleteMany({ where: { userId, listingId } })
  return { favorited: false }
}

export async function listMyFavorites(userId: string, pagination: Pagination) {
  // Listings deleted or unpublished since being favorited are filtered out in
  // the query itself so pagination and meta.total stay accurate.
  const where = { userId, listing: { status: PUBLISHED, deletedAt: null } }

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      include: { listing: true },
      orderBy: { addedAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.favorite.count({ where }),
  ])

  const items = favorites.map(({ listing, addedAt }) => ({
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    shortDescription: listing.shortDescription,
    thumbnailCid: listing.thumbnailCid,
    isFree: listing.isFree,
    price: listing.price,
    currency: listing.currency,
    status: listing.status,
    addedAt,
  }))

  return { items, meta: buildMeta(pagination.page, pagination.limit, total) }
}
