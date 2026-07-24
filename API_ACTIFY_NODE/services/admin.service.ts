import { prisma } from './prisma'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'

const ARCHIVED = 'Archived'
const CONFIRMED = 'Confirmed'
const ADMIN_ROLE = 'admin'
// Mirrors orders.service: Pending/Cancelled orders carry a 'pending:<uuid>'
// placeholder in tx_hash until a real payment confirms them.
const PENDING_TX_PREFIX = 'pending:'
const ASSET_STATUSES = ['Draft', 'Published', 'Archived', 'Suspended']
const REPORT_PENDING = 'Pending'
const REPORT_RESOLVE_STATUSES = ['Resolved', 'Rejected']

const SELLER_SELECT = { select: { id: true, username: true, displayName: true } } as const

export interface AdminAssetFilters {
  status?: string
  sellerId?: string
}

export interface AdminUserFilters {
  q?: string
  banned?: boolean
  role?: string
}

export interface AdminOrderFilters {
  status?: string
}

export interface AdminReportFilters {
  status?: string
  targetType?: string
}

export interface ResolveReportInput {
  status?: unknown
  resolutionNote?: unknown
}

function serializeAdminAsset(listing: {
  id: string
  slug: string | null
  title: string
  isFree: boolean
  price: unknown
  currency: string | null
  status: string
  viewsCount: number
  salesCount: number
  createdAt: Date
  deletedAt: Date | null
  seller: { id: string; username: string | null; displayName: string | null }
}) {
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    isFree: listing.isFree,
    price: listing.price,
    currency: listing.currency,
    status: listing.status,
    viewsCount: listing.viewsCount,
    salesCount: listing.salesCount,
    createdAt: listing.createdAt,
    deletedAt: listing.deletedAt,
    seller: listing.seller,
  }
}

function serializeAdminUser(user: {
  id: string
  username: string | null
  displayName: string | null
  email: string | null
  avatarCid: string | null
  isVerified: boolean
  isBanned: boolean
  createdAt: Date
  deletedAt: Date | null
  role: { name: string }
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarCid: user.avatarCid,
    role: user.role.name,
    isVerified: user.isVerified,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
    deletedAt: user.deletedAt,
  }
}

export async function listAllAssets(filters: AdminAssetFilters, pagination: Pagination) {
  // Admin view: every status, soft-deleted rows included.
  const where: Record<string, unknown> = {}
  if (filters.status) where.status = filters.status
  if (filters.sellerId) where.sellerId = filters.sellerId

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: { seller: SELLER_SELECT },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.listing.count({ where }),
  ])

  return { items: items.map(serializeAdminAsset), meta: buildMeta(pagination.page, pagination.limit, total) }
}

export async function updateAssetStatus(listingId: string, status: string) {
  if (!ASSET_STATUSES.includes(status)) {
    throw new AppError(400, 'VALIDATION_ERROR', `status doit être l'un de : ${ASSET_STATUSES.join(', ')}`)
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } })
  if (!listing) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }

  const updated = await prisma.listing.update({ where: { id: listingId }, data: { status } })
  return { id: updated.id, status: updated.status }
}

export async function forceDeleteAsset(listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } })
  if (!listing) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: { deletedAt: new Date(), status: ARCHIVED },
  })
  return { id: updated.id, status: updated.status, deletedAt: updated.deletedAt }
}

export async function listUsers(filters: AdminUserFilters, pagination: Pagination) {
  const where: Record<string, unknown> = {}
  if (filters.q) {
    where.OR = [
      { username: { contains: filters.q, mode: 'insensitive' } },
      { email: { contains: filters.q, mode: 'insensitive' } },
    ]
  }
  if (filters.banned !== undefined) where.isBanned = filters.banned
  if (filters.role) where.role = { name: filters.role }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { role: true },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.user.count({ where }),
  ])

  return { items: items.map(serializeAdminUser), meta: buildMeta(pagination.page, pagination.limit, total) }
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true, wallets: true } })
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable')
  }

  const [listingsCount, purchasesCount] = await Promise.all([
    prisma.listing.count({ where: { sellerId: userId } }),
    prisma.purchase.count({ where: { buyerId: userId } }),
  ])

  return {
    ...serializeAdminUser(user),
    bio: user.bio,
    wallets: user.wallets,
    stats: { listingsCount, purchasesCount },
  }
}

export async function setUserBanStatus(userId: string, banned: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } })
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable')
  }
  if (banned && user.role.name === ADMIN_ROLE) {
    throw new AppError(403, 'FORBIDDEN', 'Impossible de bannir un administrateur')
  }

  const updated = await prisma.user.update({ where: { id: userId }, data: { isBanned: banned } })
  return { id: updated.id, isBanned: updated.isBanned }
}

export async function updateUserRole(actorId: string, userId: string, roleName: string) {
  const name = (roleName ?? '').trim()
  if (name.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'role est requis')
  }

  const role = await prisma.role.findFirst({ where: { name } })
  if (!role) {
    throw new AppError(404, 'NOT_FOUND', 'Rôle introuvable')
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } })
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable')
  }

  // Lockout guard: only demotions are gated (granting admin is always fine).
  // An admin can neither demote himself nor demote the last active admin.
  if (name !== ADMIN_ROLE) {
    if (userId === actorId) {
      throw new AppError(403, 'FORBIDDEN', 'Impossible de retirer son propre rôle administrateur')
    }
    if (user.role.name === ADMIN_ROLE) {
      const adminCount = await prisma.user.count({ where: { role: { name: ADMIN_ROLE }, deletedAt: null } })
      if (adminCount === 1) {
        throw new AppError(403, 'FORBIDDEN', 'Impossible de rétrograder le dernier administrateur')
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { roleId: role.id },
    include: { role: true },
  })
  return { id: updated.id, role: updated.role.name }
}

export async function listOrders(filters: AdminOrderFilters, pagination: Pagination) {
  const where: Record<string, unknown> = {}
  if (filters.status) where.status = filters.status

  const [items, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        buyer: SELLER_SELECT,
        listing: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { purchasedAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.purchase.count({ where }),
  ])

  return {
    items: items.map((purchase) => ({
      id: purchase.id,
      buyer: purchase.buyer,
      listing: purchase.listing,
      // Mask the internal 'pending:<uuid>' placeholder like the buyer-facing API.
      txHash: purchase.txHash.startsWith(PENDING_TX_PREFIX) ? null : purchase.txHash,
      amountPaid: Number(purchase.amountPaid),
      status: purchase.status,
      purchasedAt: purchase.purchasedAt,
    })),
    meta: buildMeta(pagination.page, pagination.limit, total),
  }
}

export async function getAdminStats() {
  const [totalUsers, bannedUsers, totalAssets, assetsByStatus, totalOrders, revenue] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.listing.count(),
    prisma.listing.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.purchase.count(),
    prisma.purchase.aggregate({ where: { status: CONFIRMED }, _sum: { amountPaid: true } }),
  ])

  const countsByStatus = new Map(assetsByStatus.map((row) => [row.status, row._count._all]))
  const byStatus: Record<string, number> = {}
  for (const status of ASSET_STATUSES) {
    byStatus[status] = countsByStatus.get(status) ?? 0
  }

  return {
    totalUsers,
    bannedUsers,
    totalAssets,
    byStatus,
    totalOrders,
    confirmedRevenue: Number(revenue._sum.amountPaid ?? 0),
  }
}

function serializeAdminReport(report: {
  id: string
  targetType: string
  targetId: string
  reason: string
  details: string | null
  status: string
  resolutionNote: string | null
  resolvedAt: Date | null
  createdAt: Date
  reporter: { id: string; username: string | null; displayName: string | null }
  resolvedBy: { id: string; username: string | null; displayName: string | null } | null
}) {
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    details: report.details,
    status: report.status,
    resolutionNote: report.resolutionNote,
    resolvedAt: report.resolvedAt,
    createdAt: report.createdAt,
    reporter: report.reporter,
    resolvedBy: report.resolvedBy,
  }
}

export async function listReports(filters: AdminReportFilters, pagination: Pagination) {
  const where: Record<string, unknown> = {}
  if (filters.status) where.status = filters.status
  if (filters.targetType) where.targetType = filters.targetType

  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: { reporter: SELLER_SELECT, resolvedBy: SELLER_SELECT },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.report.count({ where }),
  ])

  return { items: items.map(serializeAdminReport), meta: buildMeta(pagination.page, pagination.limit, total) }
}

export async function resolveReport(adminId: string, reportId: string, input: ResolveReportInput) {
  if (typeof input.status !== 'string' || !REPORT_RESOLVE_STATUSES.includes(input.status)) {
    throw new AppError(400, 'VALIDATION_ERROR', `status doit être l'un de : ${REPORT_RESOLVE_STATUSES.join(', ')}`)
  }
  const resolutionNote = input.resolutionNote
  if (resolutionNote !== undefined && resolutionNote !== null && typeof resolutionNote !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'resolutionNote doit être une chaîne de caractères')
  }

  const report = await prisma.report.findUnique({ where: { id: reportId } })
  if (!report) {
    throw new AppError(404, 'NOT_FOUND', 'Signalement introuvable')
  }
  if (report.status !== REPORT_PENDING) {
    throw new AppError(409, 'REPORT_ALREADY_RESOLVED', 'Ce signalement a déjà été traité')
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: input.status,
      resolutionNote: (resolutionNote as string | undefined) ?? null,
      resolvedById: adminId,
      resolvedAt: new Date(),
    },
    include: { reporter: SELLER_SELECT, resolvedBy: SELLER_SELECT },
  })

  return serializeAdminReport(updated)
}
