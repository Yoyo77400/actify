import { prisma } from './prisma'
import { AppError } from '../utils/http'
import { queryListings, type AssetListFilters } from './assets.service'
import type { Pagination } from '../utils/pagination'

const PUBLISHED = 'Published'

async function findFollowableUserOrThrow(username: string) {
  const user = await prisma.user.findFirst({ where: { username, deletedAt: null } })
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable')
  }
  return user
}

export async function followUser(followerId: string, username: string) {
  const target = await findFollowableUserOrThrow(username)
  if (target.id === followerId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Vous ne pouvez pas vous suivre vous-même')
  }

  // Upsert keeps the operation idempotent, same pattern as favorites.
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId: target.id } },
    update: {},
    create: { followerId, followingId: target.id },
  })

  return { following: true }
}

export async function unfollowUser(followerId: string, username: string) {
  const target = await findFollowableUserOrThrow(username)
  await prisma.follow.deleteMany({ where: { followerId, followingId: target.id } })
  return { following: false }
}

// Same card shape and filters as the public catalogue / favorites - just
// scoped to listings from creators this user follows.
export async function listFollowedFeed(followerId: string, filters: AssetListFilters, pagination: Pagination) {
  return queryListings(
    { status: PUBLISHED, deletedAt: null, seller: { followers: { some: { followerId } } } },
    filters,
    pagination,
  )
}
