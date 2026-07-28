import { prisma } from './prisma'
import { revokeAllUserSessions } from './sessions.service'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/
const PUBLISHED = 'Published'

export interface UpdateMeInput {
  username?: string | null
  displayName?: string | null
  bio?: string | null
  avatarCid?: string | null
  bannerCid?: string | null
}

interface WalletSummary {
  id: string
  address: string
  chain: string
  label: string | null
  isPrimary: boolean
  createdAt: Date
}

function serializeMe(user: {
  id: string
  username: string | null
  displayName: string | null
  email: string | null
  bio: string | null
  avatarCid: string | null
  bannerCid: string | null
  isVerified: boolean
  twoFactorEnabled: boolean
  createdAt: Date
  role: { name: string }
  wallets: WalletSummary[]
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    bio: user.bio,
    avatarCid: user.avatarCid,
    bannerCid: user.bannerCid,
    wallets: user.wallets,
    role: user.role.name,
    isVerified: user.isVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
  }
}

function serializePublic(user: {
  id: string
  username: string | null
  displayName: string | null
  bio: string | null
  avatarCid: string | null
  bannerCid: string | null
  isVerified: boolean
  createdAt: Date
  role: { name: string }
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarCid: user.avatarCid,
    bannerCid: user.bannerCid,
    role: user.role.name,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  }
}

async function findActiveUserByUsername(username: string) {
  const user = await prisma.user.findFirst({
    where: { username, deletedAt: null },
    include: { role: true },
  })
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable')
  }
  return user
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { role: true, wallets: true },
  })

  const [listingsCount, purchasesCount, downloadsCount, reviewsCount, favoritesCount, followersCount, followingCount] =
    await Promise.all([
      prisma.listing.count({ where: { sellerId: userId } }),
      prisma.purchase.count({ where: { buyerId: userId } }),
      prisma.download.count({ where: { userId } }),
      prisma.review.count({ where: { reviewerId: userId } }),
      prisma.favorite.count({ where: { userId } }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ])

  return {
    ...serializeMe(user),
    stats: { listingsCount, purchasesCount, downloadsCount, reviewsCount, favoritesCount, followersCount, followingCount },
  }
}

// Shared by the user's own profile edit and the admin moderation edit.
async function applyUserUpdate(userId: string, input: UpdateMeInput) {
  const data: Record<string, string | null> = {}

  if (input.username !== undefined) {
    if (input.username !== null) {
      if (!USERNAME_PATTERN.test(input.username)) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Le username doit contenir 3 à 32 caractères alphanumériques ou underscore',
        )
      }
      const existing = await prisma.user.findUnique({ where: { username: input.username } })
      if (existing && existing.id !== userId) {
        throw new AppError(409, 'USERNAME_TAKEN', 'Ce username est déjà pris')
      }
    }
    data.username = input.username
  }

  if (input.displayName !== undefined) {
    if (input.displayName !== null && input.displayName.length > 60) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Le display name dépasse 60 caractères')
    }
    data.displayName = input.displayName
  }

  if (input.bio !== undefined) {
    if (input.bio !== null && input.bio.length > 500) {
      throw new AppError(400, 'VALIDATION_ERROR', 'La bio dépasse 500 caractères')
    }
    data.bio = input.bio
  }

  if (input.avatarCid !== undefined) {
    data.avatarCid = input.avatarCid
  }

  if (input.bannerCid !== undefined) {
    data.bannerCid = input.bannerCid
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    include: { role: true, wallets: true },
  })
}

export async function updateMe(userId: string, input: UpdateMeInput) {
  return serializeMe(await applyUserUpdate(userId, input))
}

// Admin moderation: identity fields only (username/displayName/bio) - never
// the wallet list, and never role/ban status, which already have their own
// dedicated, more carefully-guarded actions.
export async function adminUpdateUser(userId: string, input: Pick<UpdateMeInput, 'username' | 'displayName' | 'bio'>) {
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!exists) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable')
  }

  const updated = await applyUserUpdate(userId, input)
  return { id: updated.id, username: updated.username, displayName: updated.displayName, bio: updated.bio }
}

export async function softDeleteMe(userId: string) {
  // Wallets are the account's only credential — wipe them so the erased
  // account has no dangling login method, then scrub the remaining PII.
  // Sessions go too: an access token issued minutes earlier would otherwise
  // keep working against the erased account until it expired.
  await revokeAllUserSessions(userId)
  const [, user] = await prisma.$transaction([
    prisma.wallet.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        username: null,
        displayName: null,
        email: null,
        bio: null,
        avatarCid: null,
        bannerCid: null,
      },
    }),
  ])

  return { id: user.id, deletedAt: user.deletedAt }
}

export async function exportMyData(userId: string) {
  const [profile, listings, purchases, downloads, reviews, favorites, nftsOwned, resales] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { role: true, wallets: true } }),
    prisma.listing.findMany({ where: { sellerId: userId } }),
    prisma.purchase.findMany({ where: { buyerId: userId } }),
    prisma.download.findMany({ where: { userId } }),
    prisma.review.findMany({ where: { reviewerId: userId } }),
    prisma.favorite.findMany({ where: { userId } }),
    prisma.nft.findMany({ where: { currentOwnerId: userId } }),
    prisma.resale.findMany({ where: { sellerId: userId } }),
  ])

  return {
    profile: serializeMe(profile),
    listings,
    purchases,
    downloads,
    reviews,
    favorites,
    nftsOwned,
    resales,
    exportedAt: new Date(),
  }
}

export async function getPublicProfile(username: string, viewerId: string | null) {
  const user = await findActiveUserByUsername(username)

  const [listingsCount, reviewsCount, followersCount, followingCount, isFollowing] = await Promise.all([
    prisma.listing.count({ where: { sellerId: user.id, status: PUBLISHED, deletedAt: null } }),
    prisma.review.count({ where: { reviewerId: user.id } }),
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    viewerId == null
      ? Promise.resolve(false)
      : prisma.follow
          .findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } } })
          .then((f) => f != null),
  ])

  return {
    ...serializePublic(user),
    stats: { listingsCount, reviewsCount, followersCount, followingCount },
    isFollowing,
  }
}

export interface CreatorListFilters {
  q?: string
  /** 'followers' powers the homepage's "featured creators" widget. */
  sort?: 'createdAt' | 'followers'
}

function serializeCreatorCard(user: {
  id: string
  username: string | null
  displayName: string | null
  bio: string | null
  avatarCid: string | null
  bannerCid: string | null
  isVerified: boolean
  createdAt: Date
  wallets: { address: string }[]
  _count: { listings: number; followers: number }
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarCid: user.avatarCid,
    bannerCid: user.bannerCid,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    listingsCount: user._count.listings,
    followersCount: user._count.followers,
    // XRPL addresses are public by design (they're how buyers pay a seller,
    // and mint transactions are already inspectable on-ledger) - surfacing
    // the primary one here is not a new exposure.
    primaryWalletAddress: user.wallets[0]?.address ?? null,
  }
}

const CREATOR_CARD_INCLUDE = {
  wallets: { where: { isPrimary: true }, take: 1, select: { address: true } },
  _count: {
    select: {
      listings: { where: { status: PUBLISHED, deletedAt: null } },
      followers: true,
    },
  },
} as const

// The public "artist directory": any active, non-banned user with at least
// one published listing — there's no separate creator role/flag to gate on.
export async function listCreators(filters: CreatorListFilters, pagination: Pagination, viewerId: string | null) {
  const where: Record<string, unknown> = {
    deletedAt: null,
    isBanned: false,
    listings: { some: { status: PUBLISHED, deletedAt: null } },
  }
  if (filters.q) {
    where.OR = [
      { username: { contains: filters.q, mode: 'insensitive' } },
      { displayName: { contains: filters.q, mode: 'insensitive' } },
    ]
  }

  const orderBy = filters.sort === 'followers'
    ? { followers: { _count: 'desc' as const } }
    : { createdAt: 'desc' as const }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: CREATOR_CARD_INCLUDE,
      orderBy,
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.user.count({ where }),
  ])

  // Batch-resolve which of this page's creators the viewer already follows,
  // instead of one query per row.
  let followingIds = new Set<string>()
  if (viewerId != null && rows.length > 0) {
    const follows = await prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: rows.map((r) => r.id) } },
      select: { followingId: true },
    })
    followingIds = new Set(follows.map((f) => f.followingId))
  }

  const items = rows.map((user) => ({ ...serializeCreatorCard(user), isFollowing: followingIds.has(user.id) }))

  return { items, meta: buildMeta(pagination.page, pagination.limit, total) }
}

export interface FollowingListFilters {
  q?: string
}

// "Mes abonnements": everyone this user follows, regardless of whether
// they've published anything yet — unlike listCreators, which is the public
// discovery directory and only surfaces people with published listings.
export async function listFollowing(userId: string, filters: FollowingListFilters, pagination: Pagination) {
  const where: Record<string, unknown> = {
    deletedAt: null,
    followers: { some: { followerId: userId } },
  }
  if (filters.q) {
    where.OR = [
      { username: { contains: filters.q, mode: 'insensitive' } },
      { displayName: { contains: filters.q, mode: 'insensitive' } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: CREATOR_CARD_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.user.count({ where }),
  ])

  // Every row here is, by construction (the where clause above), already
  // followed by the caller.
  const items = rows.map((user) => ({ ...serializeCreatorCard(user), isFollowing: true }))

  return { items, meta: buildMeta(pagination.page, pagination.limit, total) }
}

export async function listUserAssets(username: string, pagination: Pagination) {
  const user = await findActiveUserByUsername(username)

  const where = { sellerId: user.id, status: PUBLISHED, deletedAt: null }
  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
      // Public endpoint: whitelist the exposed columns. fileIpfsCid is the
      // storage key of the paid file — leaking it would let anyone stream the
      // file through GET /files/:key and bypass the paid download flow.
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        description: true,
        thumbnailCid: true,
        isFree: true,
        price: true,
        currency: true,
        distributionMode: true,
        maxDownloads: true,
        viewsCount: true,
        salesCount: true,
        createdAt: true,
      },
    }),
    prisma.listing.count({ where }),
  ])

  return { items, meta: buildMeta(pagination.page, pagination.limit, total) }
}

export async function listUserReviews(username: string, pagination: Pagination) {
  const user = await findActiveUserByUsername(username)

  const where = { reviewerId: user.id }
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
      include: { listing: { select: { id: true, title: true } } },
    }),
    prisma.review.count({ where }),
  ])

  return { items, meta: buildMeta(pagination.page, pagination.limit, total) }
}
