import { prisma } from './prisma'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'
import { slugify } from '../utils/slug'

const PUBLISHED = 'Published'
const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 100

// A collection only counts the listings a visitor may actually see, so its
// listingCount never advertises drafts or deleted assets.
const PUBLISHED_LISTING_FILTER = { status: PUBLISHED, deletedAt: null } as const

interface CollectionRow {
  id: number
  name: string
  slug: string
  img: string | null
  _count: { listings: number }
}

function serializeCollection(collection: CollectionRow) {
  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    img: collection.img,
    listingCount: collection._count.listings,
  }
}

// listingCount = ce qui est visible publiquement, y compris pour le
// propriétaire : c'est l'information utile (« combien de mes assets sont en
// ligne »). Ses brouillons restent visibles dans la LISTE, badgés.
const COLLECTION_COUNT = {
  _count: { select: { listings: { where: PUBLISHED_LISTING_FILTER } } },
} as const

/** Same public card shape the catalogue and search already return. */
const LISTING_CARD_SELECT = {
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
  // Permet au propriétaire de distinguer ses brouillons dans sa collection.
  status: true,
} as const

export async function listCollections(pagination: Pagination) {
  const [rows, total] = await Promise.all([
    prisma.collection.findMany({
      include: COLLECTION_COUNT,
      orderBy: { name: 'asc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.collection.count(),
  ])

  return {
    items: rows.map(serializeCollection),
    meta: buildMeta(pagination.page, pagination.limit, total),
  }
}

export async function getCollectionBySlug(slug: string, viewerUserId?: string | null) {
  const existing = await prisma.collection.findUnique({ where: { slug }, select: { ownerId: true } })
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Collection introuvable')
  }

  const isOwner = viewerUserId != null && existing.ownerId === viewerUserId
  const collection = await prisma.collection.findUniqueOrThrow({
    where: { slug },
    include: COLLECTION_COUNT,
  })
  return { ...serializeCollection(collection), isOwner }
}

/** Published listings of a collection, paginated — the collection page's body. */
export async function listCollectionAssets(
  slug: string,
  pagination: Pagination,
  viewerUserId?: string | null,
) {
  const collection = await prisma.collection.findUnique({ where: { slug } })
  if (!collection) {
    throw new AppError(404, 'NOT_FOUND', 'Collection introuvable')
  }

  // Le propriétaire voit ses brouillons ; le public ne voit que le publié.
  const isOwner = viewerUserId != null && collection.ownerId === viewerUserId
  const where = isOwner
    ? { collectionId: collection.id, deletedAt: null }
    : { collectionId: collection.id, ...PUBLISHED_LISTING_FILTER }
  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      // Public endpoint: whitelist the columns. fileIpfsCid is the paid file's
      // storage key and must never leave the server.
      select: LISTING_CARD_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.listing.count({ where }),
  ])

  return { items, meta: buildMeta(pagination.page, pagination.limit, total) }
}

function validateName(name: unknown): string {
  const value = typeof name === 'string' ? name.trim() : ''
  if (value.length < NAME_MIN_LENGTH || value.length > NAME_MAX_LENGTH) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `Le nom doit contenir entre ${NAME_MIN_LENGTH} et ${NAME_MAX_LENGTH} caractères`,
    )
  }
  return value
}

/** Slug is globally unique, so a taken name is refused rather than silently suffixed. */
async function slugOrThrow(name: string, currentId?: number): Promise<string> {
  const slug = slugify(name)
  const existing = await prisma.collection.findUnique({ where: { slug } })
  if (existing && existing.id !== currentId) {
    throw new AppError(409, 'COLLECTION_EXISTS', 'Une collection porte déjà ce nom')
  }
  return slug
}

// Ownership is the whole point of owner_id: without this check any
// authenticated user could rename or delete anyone's collection.
async function getOwnedCollectionOrThrow(userId: string, id: number) {
  const collection = await prisma.collection.findUnique({ where: { id } })
  // Same 404 for "absent" and "not yours": a distinct 403 would confirm the
  // existence of collections the caller has no business knowing about.
  if (!collection || collection.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Collection introuvable')
  }
  return collection
}

export async function createCollection(userId: string, input: { name: unknown }) {
  const name = validateName(input.name)
  const slug = await slugOrThrow(name)

  const collection = await prisma.collection.create({
    data: { name, slug, ownerId: userId },
    include: COLLECTION_COUNT,
  })
  return serializeCollection(collection)
}

export async function updateCollection(userId: string, id: number, input: { name?: unknown }) {
  await getOwnedCollectionOrThrow(userId, id)

  const data: { name?: string; slug?: string } = {}
  if (input.name !== undefined) {
    data.name = validateName(input.name)
    data.slug = await slugOrThrow(data.name, id)
  }

  const collection = await prisma.collection.update({
    where: { id },
    data,
    include: COLLECTION_COUNT,
  })
  return serializeCollection(collection)
}

/**
 * Deletes a collection without touching its listings: they are detached
 * (collectionId → null) so removing a grouping never destroys published assets.
 */
export async function deleteCollection(userId: string, id: number) {
  await getOwnedCollectionOrThrow(userId, id)

  await prisma.$transaction([
    prisma.listing.updateMany({ where: { collectionId: id }, data: { collectionId: null } }),
    prisma.collection.delete({ where: { id } }),
  ])
  return { id, deleted: true }
}

/**
 * Enregistre la couverture d'une collection (clé de stockage déjà uploadée).
 * La propriété est vérifiée : sans ça, n'importe qui pourrait remplacer
 * l'image d'une collection qui ne lui appartient pas.
 */
export async function setCollectionImage(userId: string, id: number, key: string) {
  await getOwnedCollectionOrThrow(userId, id)
  const collection = await prisma.collection.update({
    where: { id },
    data: { img: key },
    include: COLLECTION_COUNT,
  })
  return serializeCollection(collection)
}

/** The caller's own collections, drafts included in the count's sibling pages. */
export async function listMyCollections(userId: string) {
  const rows = await prisma.collection.findMany({
    where: { ownerId: userId },
    include: COLLECTION_COUNT,
    orderBy: { name: 'asc' },
  })
  return rows.map(collection => ({ ...serializeCollection(collection), isOwner: true }))
}

/**
 * Resolves a collection the caller may attach a listing to. Returning null for
 * an explicit null lets a caller detach an asset from its collection.
 */
export async function assertAssignableCollection(userId: string, collectionId: number | null) {
  if (collectionId === null) return null
  await getOwnedCollectionOrThrow(userId, collectionId)
  return collectionId
}

/** Name/slug match, used by the global search. */
export async function searchCollections(q: string, pagination: Pagination) {
  const where = {
    OR: [
      { name: { contains: q, mode: 'insensitive' as const } },
      { slug: { contains: q, mode: 'insensitive' as const } },
    ],
  }

  const [rows, total] = await Promise.all([
    prisma.collection.findMany({
      where,
      include: COLLECTION_COUNT,
      orderBy: { name: 'asc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.collection.count({ where }),
  ])

  return {
    items: rows.map(serializeCollection),
    meta: buildMeta(pagination.page, pagination.limit, total),
  }
}
