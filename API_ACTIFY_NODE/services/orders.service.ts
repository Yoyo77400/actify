import { randomInt, randomUUID } from 'node:crypto'
import { prisma } from './prisma'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'
import { verifyXrplPayment } from './chains/xrpl-payment'

const ORDER_PENDING = 'Pending'
const ORDER_CONFIRMED = 'Confirmed'
const ORDER_CANCELLED = 'Cancelled'
const LISTING_PUBLISHED = 'Published'
const LIMITED_DISTRIBUTION = 'limited'
// Only native XRP payments are verifiable on-chain today; a listing priced in
// any other currency can't be confirmed until multi-currency support lands.
const SUPPORTED_CURRENCY = 'XRP'
// Informative payment window returned to the buyer; nothing expires the
// order server-side yet.
const ORDER_TTL_MS = 30 * 60 * 1000
// Purchase.txHash is required + unique in the schema, but the real hash only
// exists once the buyer has paid. Until confirmation we store a unique
// placeholder 'pending:<uuid>' and swap in the real hash at confirm time.
const PENDING_TX_PREFIX = 'pending:'
const PRISMA_UNIQUE_VIOLATION = 'P2002'
// XRPL tx hashes are 64 hex chars, case-insensitive. rippled accepts any case
// and resolves them to the same tx, so we normalize to a single canonical form
// before storing — otherwise 'abc…' and 'ABC…' would be distinct strings and
// bypass the unique-txHash reuse guard.
const TX_HASH_PATTERN = /^[0-9A-Fa-f]{64}$/
// XRPL DestinationTag is an unsigned 32-bit integer, but the payment_tag
// column is a Postgres INT4 (signed, max 2^31-1). Draw from the lower half so
// the value is both a valid DestinationTag and storable — 2^31 tags is ample.
const MAX_DESTINATION_TAG = 2 ** 31

const LISTING_SUMMARY_INCLUDE = {
  listing: {
    select: {
      id: true,
      slug: true,
      title: true,
      thumbnailCid: true,
      sellerId: true,
      distributionMode: true,
      maxDownloads: true,
    },
  },
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

async function assertLimitedStockAvailable(listing: { id: string; distributionMode: string; maxDownloads: number | null }) {
  if (listing.distributionMode !== LIMITED_DISTRIBUTION || listing.maxDownloads == null) {
    return
  }
  const confirmedCount = await prisma.purchase.count({
    where: { listingId: listing.id, status: ORDER_CONFIRMED },
  })
  if (confirmedCount >= listing.maxDownloads) {
    throw new AppError(410, 'MAX_DOWNLOADS_REACHED', 'Limite de téléchargements atteinte pour cet asset')
  }
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
  if (listing.price == null || Number(listing.price) <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Cet asset n\'a pas de prix valide')
  }
  if (listing.currency !== SUPPORTED_CURRENCY) {
    throw new AppError(400, 'VALIDATION_ERROR', `Seuls les paiements en ${SUPPORTED_CURRENCY} sont supportés`)
  }

  await assertLimitedStockAvailable(listing)

  const sellerWallet = await getSellerPrimaryWalletOrThrow(listing.sellerId)
  const paymentTag = randomInt(0, MAX_DESTINATION_TAG)

  const purchase = await prisma.purchase.create({
    data: {
      buyerId: userId,
      listingId: listing.id,
      txHash: `${PENDING_TX_PREFIX}${randomUUID()}`,
      amountPaid: listing.price,
      status: ORDER_PENDING,
      // Snapshot the destination so the buyer's payment target can't drift if
      // the seller later changes their primary wallet.
      paymentAddress: sellerWallet.address,
      paymentTag,
    },
  })

  return {
    id: purchase.id,
    status: purchase.status,
    amount: listing.price,
    currency: listing.currency,
    paymentAddress: sellerWallet.address,
    // The buyer MUST send the XRP payment with this DestinationTag for the
    // order to be confirmable.
    paymentTag,
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
  if (typeof txHash !== 'string' || !TX_HASH_PATTERN.test(txHash)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'txHash doit être un hash de transaction XRPL (64 caractères hexadécimaux)')
  }
  const normalizedTxHash = txHash.toUpperCase()

  const purchase = await getOwnedOrderOrThrow(userId, orderId)
  if (purchase.status !== ORDER_PENDING) {
    throw new AppError(409, 'ORDER_NOT_PENDING', `Impossible de confirmer une commande au statut ${purchase.status}`)
  }
  if (purchase.paymentAddress == null || purchase.paymentTag == null) {
    throw new AppError(409, 'ORDER_NOT_PENDING', 'Commande sans cible de paiement, recréez-la')
  }

  // Re-check stock at confirm: many buyers can hold Pending orders for a
  // 1-copy asset; without this they could all confirm and oversell it.
  await assertLimitedStockAvailable({
    id: purchase.listing.id,
    distributionMode: purchase.listing.distributionMode,
    maxDownloads: purchase.listing.maxDownloads,
  })

  await verifyXrplPayment({
    txHash: normalizedTxHash,
    // Use the address snapshotted at creation, not the seller's current one.
    destination: purchase.paymentAddress,
    destinationTag: purchase.paymentTag,
    // amountPaid is a Prisma Decimal; prices are XRP with at most 6 decimals,
    // which a JS number represents exactly at drop resolution.
    minAmountXrp: Number(purchase.amountPaid),
  })

  // Guard the transition on status='Pending' so a concurrent cancel (or a
  // second confirm) can't flip an already-resolved order — updateMany reports
  // 0 rows affected instead of last-writer-wins on update({ where: { id } }).
  const affected = await prisma.purchase
    .updateMany({
      where: { id: purchase.id, status: ORDER_PENDING },
      data: { status: ORDER_CONFIRMED, txHash: normalizedTxHash },
    })
    .catch((err: unknown) => {
      if (isUniqueViolation(err)) {
        throw new AppError(409, 'TX_ALREADY_USED', 'Cette transaction a déjà été utilisée pour une autre commande')
      }
      throw err
    })

  if (affected.count === 0) {
    throw new AppError(409, 'ORDER_NOT_PENDING', 'La commande a déjà été traitée')
  }

  return serializeOrder({ ...purchase, status: ORDER_CONFIRMED, txHash: normalizedTxHash })
}

export async function cancelOrder(userId: string, orderId: string) {
  const purchase = await getOwnedOrderOrThrow(userId, orderId)
  if (purchase.status !== ORDER_PENDING) {
    throw new AppError(409, 'ORDER_NOT_PENDING', `Impossible d'annuler une commande au statut ${purchase.status}`)
  }

  const affected = await prisma.purchase.updateMany({
    where: { id: purchase.id, status: ORDER_PENDING },
    data: { status: ORDER_CANCELLED },
  })
  if (affected.count === 0) {
    throw new AppError(409, 'ORDER_NOT_PENDING', 'La commande a déjà été traitée')
  }

  return serializeOrder({ ...purchase, status: ORDER_CANCELLED })
}
