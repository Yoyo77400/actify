import { prisma } from './prisma'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/
const PUBLISHED = 'Published'

export interface UpdateMeInput {
  username?: string | null
  displayName?: string | null
  bio?: string | null
  avatarCid?: string | null
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
    wallets: user.wallets,
    role: user.role.name,
    isVerified: user.isVerified,
    // Exposé pour la page Security (statut 2FA) ; jamais le secret lui-même.
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

  const [listingsCount, purchasesCount, downloadsCount, reviewsCount, favoritesCount] = await Promise.all([
    prisma.listing.count({ where: { sellerId: userId } }),
    prisma.purchase.count({ where: { buyerId: userId } }),
    prisma.download.count({ where: { userId } }),
    prisma.review.count({ where: { reviewerId: userId } }),
    prisma.favorite.count({ where: { userId } }),
  ])

  return {
    ...serializeMe(user),
    stats: { listingsCount, purchasesCount, downloadsCount, reviewsCount, favoritesCount },
  }
}

export async function updateMe(userId: string, input: UpdateMeInput) {
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

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: { role: true, wallets: true },
  })

  return serializeMe(user)
}

export async function softDeleteMe(userId: string) {
  // Wallets are the account's only credential — wipe them so the erased
  // account has no dangling login method, then scrub the remaining PII.
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

export async function getPublicProfile(username: string) {
  const user = await findActiveUserByUsername(username)

  const [listingsCount, reviewsCount] = await Promise.all([
    prisma.listing.count({ where: { sellerId: user.id, status: PUBLISHED, deletedAt: null } }),
    prisma.review.count({ where: { reviewerId: user.id } }),
  ])

  return { ...serializePublic(user), stats: { listingsCount, reviewsCount } }
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
