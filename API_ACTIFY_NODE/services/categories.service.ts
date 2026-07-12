import { prisma } from './prisma'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'
import { slugify } from '../utils/slug'

const PUBLISHED = 'Published'
const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 100

// Only Published, non-deleted listings count toward a category's catalogue.
const PUBLISHED_LISTING_FILTER = { listing: { status: PUBLISHED, deletedAt: null } } as const

const CATEGORY_INCLUDE = {
  _count: { select: { listingCategories: { where: PUBLISHED_LISTING_FILTER } } },
} as const

// Same public shape as assets.service listAssets. Its serializer is private,
// so the fields are re-selected here instead of importing internals.
const LISTING_INCLUDE = {
  seller: true,
  listingCategories: { include: { category: true } },
  listingTags: { include: { tag: true } },
} as const

export interface CategoryInput {
  name: string
}

interface CategoryWithCount {
  id: number
  name: string
  slug: string
  _count: { listingCategories: number }
}

function serializeCategory(category: CategoryWithCount) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    listingCount: category._count.listingCategories,
  }
}

type CategoryListing = Awaited<ReturnType<typeof findCategoryListings>>['rows'][number]

function serializeListing(listing: CategoryListing) {
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

function validateName(input: CategoryInput): string {
  const name = (input.name ?? '').trim()
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `Le nom doit contenir entre ${NAME_MIN_LENGTH} et ${NAME_MAX_LENGTH} caractères`,
    )
  }
  return name
}

function slugFromName(name: string): string {
  const slug = slugify(name)
  if (!slug) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Le nom doit contenir au moins un caractère alphanumérique')
  }
  return slug
}

async function assertSlugAvailable(slug: string, excludeId?: number) {
  const existing = await prisma.category.findUnique({ where: { slug } })
  if (existing && existing.id !== excludeId) {
    throw new AppError(409, 'CATEGORY_EXISTS', 'Une catégorie avec ce slug existe déjà')
  }
}

async function getCategoryByIdOrThrow(idParam: string) {
  const id = Number(idParam)
  const category = Number.isInteger(id) ? await prisma.category.findUnique({ where: { id } }) : null
  if (!category) {
    throw new AppError(404, 'NOT_FOUND', 'Catégorie introuvable')
  }
  return category
}

export async function listCategories() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' }, include: CATEGORY_INCLUDE })
  return categories.map(serializeCategory)
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({ where: { slug }, include: CATEGORY_INCLUDE })
  if (!category) {
    throw new AppError(404, 'NOT_FOUND', 'Catégorie introuvable')
  }
  return serializeCategory(category)
}

async function findCategoryListings(categoryId: number, pagination: Pagination) {
  const where = { status: PUBLISHED, deletedAt: null, listingCategories: { some: { categoryId } } }
  const [rows, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: LISTING_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.listing.count({ where }),
  ])
  return { rows, total }
}

export async function listCategoryAssets(slug: string, pagination: Pagination) {
  const category = await prisma.category.findUnique({ where: { slug } })
  if (!category) {
    throw new AppError(404, 'NOT_FOUND', 'Catégorie introuvable')
  }

  const { rows, total } = await findCategoryListings(category.id, pagination)
  return { items: rows.map(serializeListing), meta: buildMeta(pagination.page, pagination.limit, total) }
}

export async function createCategory(input: CategoryInput) {
  const name = validateName(input)
  const slug = slugFromName(name)
  await assertSlugAvailable(slug)

  const category = await prisma.category.create({ data: { name, slug } })
  return { id: category.id, name: category.name, slug: category.slug }
}

export async function updateCategory(idParam: string, input: CategoryInput) {
  const category = await getCategoryByIdOrThrow(idParam)
  const name = validateName(input)
  const slug = slugFromName(name)
  await assertSlugAvailable(slug, category.id)

  const updated = await prisma.category.update({ where: { id: category.id }, data: { name, slug } })
  return { id: updated.id, name: updated.name, slug: updated.slug }
}

export async function removeCategory(idParam: string) {
  const category = await getCategoryByIdOrThrow(idParam)

  const referencingListings = await prisma.listingCategory.count({ where: { categoryId: category.id } })
  if (referencingListings > 0) {
    throw new AppError(409, 'CATEGORY_IN_USE', 'Catégorie référencée par des assets, suppression impossible')
  }

  await prisma.category.delete({ where: { id: category.id } })
  return { id: category.id }
}
