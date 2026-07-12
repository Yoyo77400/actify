import { extname } from 'node:path'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'

const PUBLISHED = 'Published'
const PURCHASE_CONFIRMED = 'Confirmed'
const DOWNLOAD_TOKEN_TTL = '1h'
const DOWNLOAD_TOKEN_TTL_MS = 60 * 60 * 1000

const HISTORY_LISTING_SELECT = { id: true, slug: true, title: true, thumbnailCid: true } as const

// Throws unless `userId` is an active (non-banned) user entitled to download
// `listing` right now: free asset, or a confirmed purchase. Shared by the
// request and resolve paths so a token can't outlive the entitlement.
async function assertEntitled(userId: string, listing: { id: string; isFree: boolean }) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.deletedAt || user.isBanned) {
    throw new AppError(403, 'FORBIDDEN', 'Compte non autorisé')
  }
  if (listing.isFree) {
    return
  }
  const purchase = await prisma.purchase.findFirst({
    where: { buyerId: userId, listingId: listing.id, status: PURCHASE_CONFIRMED },
  })
  if (!purchase) {
    throw new AppError(403, 'LICENSE_NOT_FOUND', 'Aucune licence valide pour cet asset')
  }
}

async function getDownloadableListingOrThrow(listingId: string) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, status: PUBLISHED, deletedAt: null },
  })
  if (!listing) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }
  return listing
}

export async function requestDownload(userId: string, listingId: string) {
  const listing = await getDownloadableListingOrThrow(listingId)
  await assertEntitled(userId, listing)

  // maxDownloads is a global cap on how many distinct buyers can download
  // (limited distribution), NOT a per-token quota: a buyer who already has a
  // download row re-requests freely, only new downloaders consume the cap.
  if (listing.maxDownloads != null) {
    const alreadyDownloaded = await prisma.download.findFirst({ where: { userId, listingId: listing.id } })
    if (!alreadyDownloaded) {
      const distinctDownloaders = await prisma.download.findMany({
        where: { listingId: listing.id },
        distinct: ['userId'],
        select: { userId: true },
      })
      if (distinctDownloaders.length >= listing.maxDownloads) {
        throw new AppError(410, 'MAX_DOWNLOADS_REACHED', 'Limite de téléchargements atteinte pour cet asset')
      }
    }
  }

  if (!listing.fileIpfsCid) {
    throw new AppError(404, 'NOT_FOUND', 'Aucun fichier attaché à cet asset')
  }

  await prisma.download.create({ data: { userId, listingId: listing.id } })

  const downloadToken = jwt.sign(
    { sub: userId, cid: listing.fileIpfsCid, listingId: listing.id, type: 'download' },
    // utils/jwt.ts already fails the boot when JWT_SECRET is missing.
    process.env.JWT_SECRET!,
    { expiresIn: DOWNLOAD_TOKEN_TTL },
  )

  return { downloadToken, expiresAt: new Date(Date.now() + DOWNLOAD_TOKEN_TTL_MS) }
}

// The signed token is the sole proof this request is authorized, but the
// entitlement is re-checked against live state (ban, unpublish, refund) so a
// token issued minutes ago can't outlive the right it represents. Returns the
// storage key of the file to stream plus a friendly download filename.
export async function resolveDownloadFile(token: string): Promise<{ key: string; downloadName: string }> {
  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch {
    throw new AppError(401, 'AUTH_REQUIRED', 'Token de téléchargement invalide ou expiré')
  }

  if (
    payload.type !== 'download'
    || typeof payload.cid !== 'string'
    || typeof payload.sub !== 'string'
    || typeof payload.listingId !== 'string'
  ) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Token de téléchargement invalide ou expiré')
  }

  const listing = await getDownloadableListingOrThrow(payload.listingId)
  await assertEntitled(payload.sub, listing)

  return { key: payload.cid, downloadName: `${listing.slug ?? 'asset'}${extname(payload.cid)}` }
}

export async function listMyDownloads(userId: string, pagination: Pagination) {
  const where = { userId }
  const [items, total] = await Promise.all([
    prisma.download.findMany({
      where,
      orderBy: { downloadedAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
      include: { listing: { select: HISTORY_LISTING_SELECT } },
    }),
    prisma.download.count({ where }),
  ])

  return { items, meta: buildMeta(pagination.page, pagination.limit, total) }
}
