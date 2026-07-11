import { prisma } from './prisma'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'

const PUBLISHED = 'Published'
const SEARCH_TYPES = ['assets', 'creators', 'all']
const SUGGESTION_LIMIT = 5

const ASSET_CARD_INCLUDE = {
  seller: { select: { id: true, username: true, displayName: true } },
} as const

export interface SearchFilters {
  q?: string
  type?: string
}

interface AssetCardRow {
  id: string
  slug: string | null
  title: string
  shortDescription: string | null
  thumbnailCid: string | null
  isFree: boolean
  price: unknown
  currency: string | null
  viewsCount: number
  salesCount: number
  createdAt: Date
  seller: { id: string; username: string | null; displayName: string | null }
}

function serializeAssetCard(listing: AssetCardRow) {
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    shortDescription: listing.shortDescription,
    thumbnailCid: listing.thumbnailCid,
    isFree: listing.isFree,
    price: listing.price,
    currency: listing.currency,
    viewsCount: listing.viewsCount,
    salesCount: listing.salesCount,
    createdAt: listing.createdAt,
    seller: listing.seller,
  }
}

function serializeCreatorProfile(user: {
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

async function searchAssets(q: string, pagination: Pagination) {
  const where: Record<string, unknown> = {
    status: PUBLISHED,
    deletedAt: null,
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ],
  }

  const [rows, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: ASSET_CARD_INCLUDE,
      orderBy: { viewsCount: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.listing.count({ where }),
  ])

  return { items: rows.map(serializeAssetCard), meta: buildMeta(pagination.page, pagination.limit, total) }
}

async function searchCreators(q: string, pagination: Pagination) {
  const where: Record<string, unknown> = {
    deletedAt: null,
    OR: [
      { username: { contains: q, mode: 'insensitive' } },
      { displayName: { contains: q, mode: 'insensitive' } },
    ],
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { role: true },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.user.count({ where }),
  ])

  return { items: rows.map(serializeCreatorProfile), meta: buildMeta(pagination.page, pagination.limit, total) }
}

// Meta policy: type=assets / type=creators carry that single list's meta;
// type=all paginates both lists with the same page/limit but has two
// independent totals, so meta is omitted there.
export async function search(filters: SearchFilters, pagination: Pagination) {
  const q = (filters.q ?? '').trim()
  if (q.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Le paramètre q est requis')
  }

  const type = filters.type ?? 'all'
  if (!SEARCH_TYPES.includes(type)) {
    throw new AppError(400, 'VALIDATION_ERROR', `type doit être l'un de : ${SEARCH_TYPES.join(', ')}`)
  }

  const [assets, creators] = await Promise.all([
    type === 'creators' ? null : searchAssets(q, pagination),
    type === 'assets' ? null : searchCreators(q, pagination),
  ])

  const meta = type === 'assets' ? assets?.meta : type === 'creators' ? creators?.meta : undefined

  return {
    results: { assets: assets?.items ?? [], creators: creators?.items ?? [] },
    meta,
  }
}

export async function getSuggestions(q: string | undefined) {
  const term = (q ?? '').trim()
  if (term.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Le paramètre q est requis')
  }

  const [titleRows, tagRows, userRows] = await Promise.all([
    prisma.listing.findMany({
      where: { status: PUBLISHED, deletedAt: null, title: { contains: term, mode: 'insensitive' } },
      select: { title: true },
      orderBy: { viewsCount: 'desc' },
      take: SUGGESTION_LIMIT,
    }),
    prisma.tag.findMany({
      where: { name: { contains: term, mode: 'insensitive' } },
      select: { name: true },
      orderBy: { name: 'asc' },
      take: SUGGESTION_LIMIT,
    }),
    prisma.user.findMany({
      where: { deletedAt: null, username: { contains: term, mode: 'insensitive' } },
      select: { username: true },
      orderBy: { username: 'asc' },
      take: SUGGESTION_LIMIT,
    }),
  ])

  return {
    titles: titleRows.map((row) => row.title),
    tags: tagRows.map((row) => row.name),
    usernames: userRows.map((row) => row.username).filter((username): username is string => username !== null),
  }
}
