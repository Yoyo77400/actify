import { prisma } from './prisma'
import { AppError } from '../utils/http'

const CONFIRMED = 'Confirmed'
const TOP_ASSETS_LIMIT = 5
const REVENUE_PERIODS = ['day', 'week', 'month']
const DEFAULT_RANGE_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export interface RevenueQuery {
  period?: string
  from?: string
  to?: string
}

export async function getCreatorStats(userId: string) {
  const [listings, sales] = await Promise.all([
    prisma.listing.findMany({
      where: { sellerId: userId, deletedAt: null },
      select: { id: true, title: true, viewsCount: true },
    }),
    prisma.purchase.groupBy({
      by: ['listingId'],
      where: { status: CONFIRMED, listing: { sellerId: userId } },
      _sum: { amountPaid: true },
      _count: { _all: true },
    }),
  ])

  let revenue = 0
  let salesCount = 0
  const salesByListing = new Map<string, { revenue: number; salesCount: number }>()
  for (const row of sales) {
    const rowRevenue = Number(row._sum.amountPaid ?? 0)
    revenue += rowRevenue
    salesCount += row._count._all
    salesByListing.set(row.listingId, { revenue: rowRevenue, salesCount: row._count._all })
  }

  const topAssets = listings
    .map((listing) => {
      const listingSales = salesByListing.get(listing.id)
      return {
        id: listing.id,
        title: listing.title,
        revenue: listingSales?.revenue ?? 0,
        salesCount: listingSales?.salesCount ?? 0,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, TOP_ASSETS_LIMIT)

  return {
    revenue,
    salesCount,
    totalViews: listings.reduce((sum, listing) => sum + listing.viewsCount, 0),
    assetsCount: listings.length,
    topAssets,
  }
}

export async function getCreatorAssetStats(userId: string, listingId: string) {
  const listing = await prisma.listing.findFirst({ where: { id: listingId, deletedAt: null } })
  // Same 404 for "unknown" and "not mine": don't reveal other sellers' assets.
  if (!listing || listing.sellerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }

  const [salesAgg, downloadsCount, favoritesCount, reviewsAgg] = await Promise.all([
    prisma.purchase.aggregate({
      where: { listingId, status: CONFIRMED },
      _sum: { amountPaid: true },
      _count: { _all: true },
    }),
    prisma.download.count({ where: { listingId } }),
    prisma.favorite.count({ where: { listingId } }),
    prisma.review.aggregate({ where: { listingId }, _avg: { rating: true }, _count: { _all: true } }),
  ])

  return {
    views: listing.viewsCount,
    salesCount: salesAgg._count._all,
    revenue: Number(salesAgg._sum.amountPaid ?? 0),
    downloadsCount,
    favoritesCount,
    reviewsCount: reviewsAgg._count._all,
    averageRating: reviewsAgg._avg.rating,
  }
}

function parseDate(value: string, name: string): Date {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, 'VALIDATION_ERROR', `${name} n'est pas une date valide`)
  }
  return date
}

function bucketKey(date: Date, period: string): string {
  if (period === 'month') return date.toISOString().slice(0, 7)
  if (period === 'week') {
    // ISO week bucket, keyed by the date of its Monday (UTC).
    const daysSinceMonday = (date.getUTCDay() + 6) % 7
    return new Date(date.getTime() - daysSinceMonday * DAY_MS).toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

export async function getCreatorRevenue(userId: string, query: RevenueQuery) {
  const period = query.period ?? 'day'
  if (!REVENUE_PERIODS.includes(period)) {
    throw new AppError(400, 'VALIDATION_ERROR', `period doit être l'un de : ${REVENUE_PERIODS.join(', ')}`)
  }

  const to = query.to !== undefined ? parseDate(query.to, 'to') : new Date()
  const from =
    query.from !== undefined ? parseDate(query.from, 'from') : new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS)

  const purchases = await prisma.purchase.findMany({
    where: { status: CONFIRMED, purchasedAt: { gte: from, lte: to }, listing: { sellerId: userId } },
    select: { amountPaid: true, purchasedAt: true },
  })

  // Bucketing (especially ISO weeks) is simpler in JS than in SQL, and the
  // window is bounded so the row count stays small.
  const buckets = new Map<string, { revenue: number; salesCount: number }>()
  for (const purchase of purchases) {
    const key = bucketKey(purchase.purchasedAt, period)
    const bucket = buckets.get(key) ?? { revenue: 0, salesCount: 0 }
    bucket.revenue += Number(purchase.amountPaid)
    bucket.salesCount += 1
    buckets.set(key, bucket)
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, bucket]) => ({ period: key, revenue: bucket.revenue, salesCount: bucket.salesCount }))
}
