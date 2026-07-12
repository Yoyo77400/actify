import { prisma } from './prisma'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'
import { slugify } from '../utils/slug'

const DRAFT = 'Draft'
const PUBLISHED = 'Published'
const ARCHIVED = 'Archived'
const DISTRIBUTION_MODES = ['unlimited', 'limited', 'unique']

const FULL_INCLUDE = {
  seller: true,
  listingCategories: { include: { category: true } },
  listingTags: { include: { tag: true } },
  nft: true,
} as const

type FullListing = Awaited<ReturnType<typeof getFullListingOrThrow>>

export interface CreateAssetInput {
  title: string
  description?: string | null
  shortDescription?: string | null
  tags?: string[]
  categoryIds?: number[]
  distributionMode?: string
  maxDownloads?: number | null
  isFree?: boolean
  basePrice?: number | null
  currency?: string | null
  royaltyBps?: number | null
  fileIpfsCid?: string | null
  thumbnailCid?: string | null
}

export type UpdateAssetInput = Partial<CreateAssetInput>

export interface AssetListFilters {
  q?: string
  category?: string
  tags?: string
  isFree?: boolean
  mode?: string
  minPrice?: number
  maxPrice?: number
  creator?: string
  sort?: string
  order?: 'asc' | 'desc'
}

function serializeListing(listing: FullListing) {
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    shortDescription: listing.shortDescription,
    description: listing.description,
    thumbnailCid: listing.thumbnailCid,
    isFree: listing.isFree,
    price: listing.price,
    currency: listing.currency,
    distributionMode: listing.distributionMode,
    maxDownloads: listing.maxDownloads,
    royaltyBps: listing.royaltyPercentage != null ? Math.round(Number(listing.royaltyPercentage) * 100) : null,
    status: listing.status,
    viewsCount: listing.viewsCount,
    salesCount: listing.salesCount,
    hasFile: listing.fileIpfsCid != null,
    // Tokenization status: one asset = one XLS-20 NFToken once minted.
    tokenized: listing.nft != null,
    nft: listing.nft
      ? { nftokenId: listing.nft.nftokenId, issuer: listing.nft.issuer, mintTxHash: listing.nft.mintTxHash }
      : null,
    createdAt: listing.createdAt,
    seller: { id: listing.seller.id, username: listing.seller.username, displayName: listing.seller.displayName },
    categories: listing.listingCategories.map((lc) => ({
      id: lc.category.id,
      name: lc.category.name,
      slug: lc.category.slug,
    })),
    tags: listing.listingTags.map((lt) => lt.tag.name),
  }
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return []
  const cleaned = tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0 && tag.length <= 32)
  return [...new Set(cleaned)]
}

function validateDistributionMode(mode: string) {
  if (!DISTRIBUTION_MODES.includes(mode)) {
    throw new AppError(400, 'VALIDATION_ERROR', `distributionMode doit être l'un de : ${DISTRIBUTION_MODES.join(', ')}`)
  }
}

function validateRoyaltyBps(bps: number) {
  if (bps < 0 || bps > 10000) {
    throw new AppError(400, 'VALIDATION_ERROR', 'royaltyBps doit être compris entre 0 et 10000')
  }
}

async function assertCategoriesExist(categoryIds: number[]) {
  if (categoryIds.length === 0) return
  const found = await prisma.category.count({ where: { id: { in: categoryIds } } })
  if (found !== categoryIds.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Une ou plusieurs catégories sont introuvables')
  }
}

async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title) || 'asset'
  let candidate = base
  let attempt = 1

  while (true) {
    const existing = await prisma.listing.findUnique({ where: { slug: candidate } })
    if (!existing || existing.id === excludeId) {
      return candidate
    }
    attempt += 1
    candidate = `${base}-${attempt}`
  }
}

type PrismaTx = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>

async function syncCategories(tx: PrismaTx, listingId: string, categoryIds: number[]) {
  await tx.listingCategory.deleteMany({ where: { listingId } })
  if (categoryIds.length > 0) {
    await tx.listingCategory.createMany({ data: categoryIds.map((categoryId) => ({ listingId, categoryId })) })
  }
}

async function syncTags(tx: PrismaTx, listingId: string, tagNames: string[]) {
  await tx.listingTag.deleteMany({ where: { listingId } })
  for (const name of tagNames) {
    const tag = await tx.tag.upsert({ where: { name }, update: {}, create: { name } })
    await tx.listingTag.create({ data: { listingId, tagId: tag.id } })
  }
}

async function getFullListingOrThrow(id: string) {
  return prisma.listing.findUniqueOrThrow({ where: { id }, include: FULL_INCLUDE })
}

async function getOwnedListingOrThrow(userId: string, listingId: string) {
  const listing = await prisma.listing.findFirst({ where: { id: listingId, deletedAt: null } })
  if (!listing || listing.sellerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }
  return listing
}

export async function createAsset(userId: string, input: CreateAssetInput) {
  const title = (input.title ?? '').trim()
  if (title.length < 3 || title.length > 200) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Le titre doit contenir entre 3 et 200 caractères')
  }

  const distributionMode = input.distributionMode ?? 'unlimited'
  validateDistributionMode(distributionMode)

  if (input.royaltyBps != null) {
    validateRoyaltyBps(input.royaltyBps)
  }

  const categoryIds = [...new Set(input.categoryIds ?? [])]
  await assertCategoriesExist(categoryIds)

  const tagNames = normalizeTags(input.tags)
  const slug = await generateUniqueSlug(title)

  const listing = await prisma.$transaction(async (tx) => {
    const created = await tx.listing.create({
      data: {
        sellerId: userId,
        title,
        slug,
        shortDescription: input.shortDescription ?? null,
        description: input.description ?? null,
        distributionMode,
        maxDownloads: input.maxDownloads ?? null,
        isFree: input.isFree ?? false,
        price: input.basePrice ?? null,
        currency: input.currency ?? null,
        royaltyPercentage: input.royaltyBps != null ? input.royaltyBps / 100 : null,
        fileIpfsCid: input.fileIpfsCid ?? null,
        thumbnailCid: input.thumbnailCid ?? null,
      },
    })

    await syncCategories(tx, created.id, categoryIds)
    await syncTags(tx, created.id, tagNames)

    return created
  })

  return serializeListing(await getFullListingOrThrow(listing.id))
}

export async function updateAsset(userId: string, listingId: string, input: UpdateAssetInput) {
  await getOwnedListingOrThrow(userId, listingId)

  const data: Record<string, unknown> = {}

  if (input.title !== undefined) {
    const title = input.title.trim()
    if (title.length < 3 || title.length > 200) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Le titre doit contenir entre 3 et 200 caractères')
    }
    data.title = title
    data.slug = await generateUniqueSlug(title, listingId)
  }

  if (input.shortDescription !== undefined) data.shortDescription = input.shortDescription
  if (input.description !== undefined) data.description = input.description

  if (input.distributionMode !== undefined) {
    validateDistributionMode(input.distributionMode)
    data.distributionMode = input.distributionMode
  }

  if (input.maxDownloads !== undefined) data.maxDownloads = input.maxDownloads
  if (input.isFree !== undefined) data.isFree = input.isFree
  if (input.basePrice !== undefined) data.price = input.basePrice
  if (input.currency !== undefined) data.currency = input.currency
  if (input.fileIpfsCid !== undefined) data.fileIpfsCid = input.fileIpfsCid
  if (input.thumbnailCid !== undefined) data.thumbnailCid = input.thumbnailCid

  if (input.royaltyBps !== undefined) {
    if (input.royaltyBps != null) validateRoyaltyBps(input.royaltyBps)
    data.royaltyPercentage = input.royaltyBps != null ? input.royaltyBps / 100 : null
  }

  let categoryIds: number[] | undefined
  if (input.categoryIds !== undefined) {
    categoryIds = [...new Set(input.categoryIds)]
    await assertCategoriesExist(categoryIds)
  }

  const tagNames = input.tags !== undefined ? normalizeTags(input.tags) : undefined

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.listing.update({ where: { id: listingId }, data })
    }
    if (categoryIds !== undefined) {
      await syncCategories(tx, listingId, categoryIds)
    }
    if (tagNames !== undefined) {
      await syncTags(tx, listingId, tagNames)
    }
  })

  return serializeListing(await getFullListingOrThrow(listingId))
}

export async function softDeleteAsset(userId: string, listingId: string) {
  await getOwnedListingOrThrow(userId, listingId)
  const updated = await prisma.listing.update({ where: { id: listingId }, data: { deletedAt: new Date() } })
  return { id: updated.id, deletedAt: updated.deletedAt }
}

export async function publishAsset(userId: string, listingId: string) {
  const listing = await getOwnedListingOrThrow(userId, listingId)
  if (listing.status !== DRAFT) {
    throw new AppError(409, 'INVALID_ASSET_STATUS', `Impossible de publier un asset au statut ${listing.status}`)
  }
  // One asset = one on-chain NFToken: an asset must be tokenized before it can
  // go live on the marketplace.
  const nft = await prisma.nft.findUnique({ where: { listingId } })
  if (!nft) {
    throw new AppError(409, 'NOT_TOKENIZED', 'Tokenisez l\'asset (mint XRPL) avant de le publier')
  }
  await prisma.listing.update({ where: { id: listingId }, data: { status: PUBLISHED } })
  return serializeListing(await getFullListingOrThrow(listingId))
}

export async function unpublishAsset(userId: string, listingId: string) {
  const listing = await getOwnedListingOrThrow(userId, listingId)
  if (listing.status !== PUBLISHED) {
    throw new AppError(409, 'INVALID_ASSET_STATUS', `Impossible de dépublier un asset au statut ${listing.status}`)
  }
  await prisma.listing.update({ where: { id: listingId }, data: { status: ARCHIVED } })
  return serializeListing(await getFullListingOrThrow(listingId))
}

export async function getAssetByIdOrSlug(idOrSlug: string, viewerUserId: string | null) {
  const listing = await prisma.listing.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], deletedAt: null },
    include: FULL_INCLUDE,
  })
  if (!listing) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }
  // Drafts/archived assets are only visible to their owner — everyone else
  // gets the same 404 a nonexistent asset would return.
  if (listing.status !== PUBLISHED && listing.sellerId !== viewerUserId) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }

  if (listing.status === PUBLISHED) {
    await prisma.listing.update({ where: { id: listing.id }, data: { viewsCount: { increment: 1 } } })
    listing.viewsCount += 1
  }

  // Detail view carries the rating aggregate (list views don't, to keep them cheap).
  const rating = await prisma.review.aggregate({
    where: { listingId: listing.id },
    _avg: { rating: true },
    _count: { _all: true },
  })

  return {
    ...serializeListing(listing),
    averageRating: rating._avg.rating != null ? Number(rating._avg.rating.toFixed(2)) : null,
    reviewsCount: rating._count._all,
  }
}

// A creator's own listings across ALL statuses (Draft/Published/Archived) so
// they can manage drafts and tokenize/publish — GET /assets is Published-only.
export async function listMyListings(userId: string, pagination: Pagination) {
  const where = { sellerId: userId, deletedAt: null }
  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: FULL_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.listing.count({ where }),
  ])
  return { items: items.map(serializeListing), meta: buildMeta(pagination.page, pagination.limit, total) }
}

function buildWhere(filters: AssetListFilters) {
  const where: Record<string, unknown> = { status: PUBLISHED, deletedAt: null }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
    ]
  }
  if (filters.category) {
    where.listingCategories = { some: { category: { slug: filters.category } } }
  }
  if (filters.tags) {
    const tagNames = filters.tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
    if (tagNames.length > 0) {
      where.listingTags = { some: { tag: { name: { in: tagNames } } } }
    }
  }
  if (filters.isFree !== undefined) {
    where.isFree = filters.isFree
  }
  if (filters.mode) {
    where.distributionMode = filters.mode
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    }
  }
  if (filters.creator) {
    where.seller = { username: filters.creator }
  }

  return where
}

const SORTABLE_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  price: 'price',
  sales: 'salesCount',
  views: 'viewsCount',
}

export async function listAssets(filters: AssetListFilters, pagination: Pagination) {
  const where = buildWhere(filters)
  const order = filters.order === 'asc' ? 'asc' : 'desc'

  if (filters.sort === 'rating') {
    return listAssetsByRating(where, order, pagination)
  }

  const orderByField = SORTABLE_FIELDS[filters.sort ?? 'createdAt'] ?? 'createdAt'

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: FULL_INCLUDE,
      orderBy: { [orderByField]: order },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.listing.count({ where }),
  ])

  return { items: items.map(serializeListing), meta: buildMeta(pagination.page, pagination.limit, total) }
}

// Prisma can't order by an aggregated relation average, so for this one sort
// option we resolve matching ids first, rank them by average rating in JS,
// then page and fetch full rows. Fine at marketplace scale; revisit with a
// precomputed rating column (aggregated_stats) if the catalogue gets huge.
async function listAssetsByRating(where: object, order: 'asc' | 'desc', pagination: Pagination) {
  const matches = await prisma.listing.findMany({ where, select: { id: true } })
  const ids = matches.map((m) => m.id)
  const total = ids.length

  if (ids.length === 0) {
    return { items: [], meta: buildMeta(pagination.page, pagination.limit, 0) }
  }

  const averages = await prisma.review.groupBy({
    by: ['listingId'],
    where: { listingId: { in: ids } },
    _avg: { rating: true },
  })
  const ratingById = new Map(averages.map((a) => [a.listingId, a._avg.rating ?? 0]))

  const rankedIds = ids
    .slice()
    .sort((a, b) => {
      const diff = (ratingById.get(a) ?? 0) - (ratingById.get(b) ?? 0)
      return order === 'asc' ? diff : -diff
    })
    .slice(pagination.skip, pagination.skip + pagination.limit)

  const rows = await prisma.listing.findMany({ where: { id: { in: rankedIds } }, include: FULL_INCLUDE })
  const rowsById = new Map(rows.map((r) => [r.id, r]))
  const items = rankedIds.map((id) => serializeListing(rowsById.get(id)!))

  return { items, meta: buildMeta(pagination.page, pagination.limit, total) }
}
