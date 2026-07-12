import { prisma } from './prisma'

const PUBLISHED = 'Published'
const CONFIRMED = 'Confirmed'
const TRENDING_LIMIT = 10
const TOP_CREATORS_LIMIT = 10
const TRENDING_WINDOW_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

const ASSET_CARD_INCLUDE = {
  seller: { select: { id: true, username: true, displayName: true } },
} as const

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

export async function getMarketplaceStats() {
  const [totalAssets, totalUsers, volume, totalSales] = await Promise.all([
    prisma.listing.count({ where: { status: PUBLISHED, deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.purchase.aggregate({ where: { status: CONFIRMED }, _sum: { amountPaid: true } }),
    prisma.purchase.count({ where: { status: CONFIRMED } }),
  ])

  return { totalAssets, totalUsers, totalVolume: Number(volume._sum.amountPaid ?? 0), totalSales }
}

export async function getTrendingAssets() {
  const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * DAY_MS)

  const recentSales = await prisma.purchase.groupBy({
    by: ['listingId'],
    where: { status: CONFIRMED, purchasedAt: { gte: since } },
    _count: { _all: true },
  })

  const rankedIds = recentSales
    .slice()
    .sort((a, b) => b._count._all - a._count._all)
    .map((row) => row.listingId)

  const trending: AssetCardRow[] = []
  if (rankedIds.length > 0) {
    const rows = await prisma.listing.findMany({
      where: { id: { in: rankedIds }, status: PUBLISHED, deletedAt: null },
      include: ASSET_CARD_INCLUDE,
    })
    const rowsById = new Map(rows.map((row) => [row.id, row]))
    for (const id of rankedIds) {
      const row = rowsById.get(id)
      if (row) trending.push(row)
      if (trending.length === TRENDING_LIMIT) break
    }
  }

  // Not enough recent sales to fill the top 10 — fall back to most viewed.
  if (trending.length < TRENDING_LIMIT) {
    const fill = await prisma.listing.findMany({
      where: { status: PUBLISHED, deletedAt: null, id: { notIn: trending.map((row) => row.id) } },
      include: ASSET_CARD_INCLUDE,
      orderBy: { viewsCount: 'desc' },
      take: TRENDING_LIMIT - trending.length,
    })
    trending.push(...fill)
  }

  return trending.map(serializeAssetCard)
}

export async function getTopCreators() {
  const salesByListing = await prisma.purchase.groupBy({
    by: ['listingId'],
    where: { status: CONFIRMED },
    _sum: { amountPaid: true },
    _count: { _all: true },
  })
  if (salesByListing.length === 0) return []

  const listings = await prisma.listing.findMany({
    where: { id: { in: salesByListing.map((row) => row.listingId) } },
    select: { id: true, sellerId: true },
  })
  const sellerByListing = new Map(listings.map((listing) => [listing.id, listing.sellerId]))

  const totalsBySeller = new Map<string, { revenue: number; salesCount: number }>()
  for (const row of salesByListing) {
    const sellerId = sellerByListing.get(row.listingId)
    if (!sellerId) continue
    const totals = totalsBySeller.get(sellerId) ?? { revenue: 0, salesCount: 0 }
    totals.revenue += Number(row._sum.amountPaid ?? 0)
    totals.salesCount += row._count._all
    totalsBySeller.set(sellerId, totals)
  }

  const topSellers = [...totalsBySeller.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, TOP_CREATORS_LIMIT)

  const users = await prisma.user.findMany({
    where: { id: { in: topSellers.map(([sellerId]) => sellerId) }, deletedAt: null },
    select: { id: true, username: true, displayName: true, avatarCid: true },
  })
  const userById = new Map(users.map((user) => [user.id, user]))

  // Deleted sellers drop out of the ranking instead of leaking a ghost entry.
  return topSellers.flatMap(([sellerId, totals]) => {
    const user = userById.get(sellerId)
    return user ? [{ ...user, revenue: totals.revenue, salesCount: totals.salesCount }] : []
  })
}
