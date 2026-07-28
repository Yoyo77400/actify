import { prisma } from './prisma'
import { AppError } from '../utils/http'
import { queryListings, type AssetListFilters } from './assets.service'
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

// Same card shape and filters (search, category, price range, free/paid,
// rarity, sort) as the public catalogue and "my listings" - just scoped to
// listings this user has favorited. Listings deleted or unpublished since
// being favorited are excluded, same as before.
export async function listMyFavorites(userId: string, filters: AssetListFilters, pagination: Pagination) {
  return queryListings({ status: PUBLISHED, deletedAt: null, favorites: { some: { userId } } }, filters, pagination)
}
