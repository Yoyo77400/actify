import { randomUUID } from 'node:crypto'
import { prisma } from './prisma'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'
import { verifyXrplPayment } from './chains/xrpl-payment'

const ORDER_PENDING = 'Pending'
const ORDER_CONFIRMED = 'Confirmed'
const ORDER_CANCELLED = 'Cancelled'
const LISTING_PUBLISHED = 'Published'
const LIMITED_DISTRIBUTION = 'limited'
// Informative payment window returned to the buyer; nothing expires the
// order server-side yet.
const ORDER_TTL_MS = 30 * 60 * 1000
// Purchase.txHash is required + unique in the schema, but the real hash only
// exists once the buyer has paid. Until confirmation we store a unique
// placeholder 'pending:<uuid>' and swap in the real hash at confirm time.
const PENDING_TX_PREFIX = 'pending:'
const PRISMA_UNIQUE_VIOLATION = 'P2002'

const LISTING_SUMMARY_INCLUDE = {
  listing: { select: { id: true, slug: true, title: true, thumbnailCid: true, sellerId: true } },
} as const

type OrderWithListing = Awaited<ReturnType<typeof getOwnedOrderOrThrow>>

export interface CreateOrderInput {
  assetId?: string
}

function serializeOrder(purchase: OrderWithListing) {
  return {
    id: purchase.id,
    status: purchase.status,
    amount: purchase.amountPaid,
    txHash: purchase.txHash.startsWith(PENDING_TX_PREFIX) ? null : purchase.txHash,
    purchasedAt: purchase.purchasedAt,
    listing: {
      id: purchase.listing.id,
      slug: purchase.listing.slug,
      title: purchase.listing.title,
      thumbnailCid: purchase.listing.thumbnailCid,
    },
  }
}

// Duck-typed rather than instanceof so the check also works against the
// mocked prisma client in unit tests.
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === PRISMA_UNIQUE_VIOLATION
}

async function getOwnedOrderOrThrow(userId: string, orderId: string) {
  const purchase = await prisma.purchase.findFirst({ where: { id: orderId }, include: LISTING_SUMMARY_INCLUDE })
  if (!purchase || purchase.buyerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Commande introuvable')
  }
  return purchase
}

async function getSellerPrimaryWalletOrThrow(sellerId: string) {
  const wallet = await prisma.wallet.findFirst({ where: { userId: sellerId, isPrimary: true } })
  if (!wallet) {
    throw new AppError(400, 'WALLET_NOT_LINKED', 'Le vendeur n\'a aucun wallet lié pour recevoir le paiement')
  }
  return wallet
}

export async function createOrder(userId: string, input: CreateOrderInput) {
  if (!input.assetId || typeof input.assetId !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'assetId est requis')
  }

  const listing = await prisma.listing.findFirst({ where: { id: input.assetId, deletedAt: null } })
  if (!listing || listing.status !== LISTING_PUBLISHED) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }
  if (listing.sellerId === userId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Impossible d\'acheter votre propre asset')
  }
  if (listing.isFree) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Un asset gratuit ne nécessite pas de commande')
  }
  if (listing.price == null) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Cet asset n\'a pas de prix défini')
  }

  if (listing.distributionMode === LIMITED_DISTRIBUTION && listing.maxDownloads != null) {
    const confirmedCount = await prisma.purchase.count({
      where: { listingId: listing.id, status: ORDER_CONFIRMED },
    })
    if (confirmedCount >= listing.maxDownloads) {
      throw new AppError(410, 'MAX_DOWNLOADS_REACHED', 'Limite de téléchargements atteinte pour cet asset')
    }
  }

  const sellerWallet = await getSellerPrimaryWalletOrThrow(listing.sellerId)

  const purchase = await prisma.purchase.create({
    data: {
      buyerId: userId,
      listingId: listing.id,
      txHash: `${PENDING_TX_PREFIX}${randomUUID()}`,
      amountPaid: listing.price,
      status: ORDER_PENDING,
    },
  })

  return {
    id: purchase.id,
    status: purchase.status,
    amount: listing.price,
    currency: listing.currency,
    paymentAddress: sellerWallet.address,
    expiresAt: new Date(purchase.purchasedAt.getTime() + ORDER_TTL_MS),
  }
}

export async function listOrders(userId: string, pagination: Pagination) {
  const where = { buyerId: userId }

  const [items, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: LISTING_SUMMARY_INCLUDE,
      orderBy: { purchasedAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.purchase.count({ where }),
  ])

  return { items: items.map(serializeOrder), meta: buildMeta(pagination.page, pagination.limit, total) }
}

export async function getOrder(userId: string, orderId: string) {
  return serializeOrder(await getOwnedOrderOrThrow(userId, orderId))
}

export async function confirmOrder(userId: string, orderId: string, txHash: unknown) {
  if (!txHash || typeof txHash !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'txHash est requis')
  }

  const purchase = await getOwnedOrderOrThrow(userId, orderId)
  if (purchase.status !== ORDER_PENDING) {
    throw new AppError(409, 'ORDER_NOT_PENDING', `Impossible de confirmer une commande au statut ${purchase.status}`)
  }

  const sellerWallet = await getSellerPrimaryWalletOrThrow(purchase.listing.sellerId)

  // amountPaid is a Prisma Decimal; prices are XRP with at most 6 decimals,
  // which a JS number represents exactly at drop resolution.
  await verifyXrplPayment({
    txHash,
    destination: sellerWallet.address,
    minAmountXrp: Number(purchase.amountPaid),
  })

  const updated = await prisma.purchase
    .update({ where: { id: purchase.id }, data: { status: ORDER_CONFIRMED, txHash } })
    .catch((err: unknown) => {
      if (isUniqueViolation(err)) {
        throw new AppError(409, 'TX_ALREADY_USED', 'Cette transaction a déjà été utilisée pour une autre commande')
      }
      throw err
    })

  return serializeOrder({ ...purchase, status: updated.status, txHash: updated.txHash })
}

export async function cancelOrder(userId: string, orderId: string) {
  const purchase = await getOwnedOrderOrThrow(userId, orderId)
  if (purchase.status !== ORDER_PENDING) {
    throw new AppError(409, 'ORDER_NOT_PENDING', `Impossible d'annuler une commande au statut ${purchase.status}`)
  }

  const updated = await prisma.purchase.update({ where: { id: purchase.id }, data: { status: ORDER_CANCELLED } })

  return serializeOrder({ ...purchase, status: updated.status })
}
