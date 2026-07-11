import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'

const PUBLISHED = 'Published'
const PURCHASE_CONFIRMED = 'Confirmed'
const DOWNLOAD_TOKEN_TTL = '1h'
const DOWNLOAD_TOKEN_TTL_MS = 60 * 60 * 1000
const IPFS_GATEWAY_BASE_URL = 'https://ipfs.io/ipfs'

const HISTORY_LISTING_SELECT = { id: true, slug: true, title: true, thumbnailCid: true } as const

export async function requestDownload(userId: string, listingId: string) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, status: PUBLISHED, deletedAt: null },
  })
  if (!listing) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }

  // Entitlement is checked off-chain for now: free listing, or a confirmed
  // purchase by the caller. On-chain license verification comes with the NFT work.
  if (!listing.isFree) {
    const purchase = await prisma.purchase.findFirst({
      where: { buyerId: userId, listingId: listing.id, status: PURCHASE_CONFIRMED },
    })
    if (!purchase) {
      throw new AppError(403, 'LICENSE_NOT_FOUND', 'Aucune licence valide pour cet asset')
    }
  }

  // maxDownloads is a global cap across all buyers (limited distribution),
  // not a per-user quota.
  if (listing.maxDownloads != null) {
    const totalDownloads = await prisma.download.count({ where: { listingId: listing.id } })
    if (totalDownloads >= listing.maxDownloads) {
      throw new AppError(410, 'MAX_DOWNLOADS_REACHED', 'Limite de téléchargements atteinte pour cet asset')
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

// The signed token is the sole proof of entitlement — no auth header on this
// path. Anything not a valid, unexpired download token maps to the same 401.
export function resolveDownloadUrl(token: string): string {
  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload
  } catch {
    throw new AppError(401, 'AUTH_REQUIRED', 'Token de téléchargement invalide ou expiré')
  }

  if (payload.type !== 'download' || typeof payload.cid !== 'string') {
    throw new AppError(401, 'AUTH_REQUIRED', 'Token de téléchargement invalide ou expiré')
  }

  return `${IPFS_GATEWAY_BASE_URL}/${payload.cid}`
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
