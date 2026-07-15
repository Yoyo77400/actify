import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../utils/http'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findFirst: vi.fn() },
    purchase: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    wallet: { findFirst: vi.fn() },
  },
}))

vi.mock('../services/chains/xrpl-payment', () => ({
  verifyXrplPayment: vi.fn(),
}))

import { prisma } from '../services/prisma'
import { verifyXrplPayment } from '../services/chains/xrpl-payment'
import {
  cancelOrder,
  confirmOrder,
  createOrder,
  getOrder,
  getPendingOrderForAsset,
  listOrders,
} from '../services/orders.service'

const listingFindFirst = vi.mocked(prisma.listing.findFirst)
const purchaseCount = vi.mocked(prisma.purchase.count)
const purchaseCreate = vi.mocked(prisma.purchase.create)
const purchaseFindFirst = vi.mocked(prisma.purchase.findFirst)
const purchaseFindMany = vi.mocked(prisma.purchase.findMany)
const purchaseUpdateMany = vi.mocked(prisma.purchase.updateMany)
const walletFindFirst = vi.mocked(prisma.wallet.findFirst)
const verifyPayment = vi.mocked(verifyXrplPayment)

const BUYER_ID = 'buyer-1'
const SELLER_ID = 'seller-1'
const PURCHASED_AT = new Date('2026-01-01T00:00:00Z')
// A real 64-char hex XRPL transaction hash (lowercase, to exercise normalization).
const REAL_TX_HASH = 'a'.repeat(64)
const NORMALIZED_TX_HASH = 'A'.repeat(64)

const publishedListing = {
  id: 'listing-1',
  sellerId: SELLER_ID,
  status: 'Published',
  isFree: false,
  price: 5,
  currency: 'XRP',
  distributionMode: 'unlimited',
  maxDownloads: null,
  deletedAt: null,
}

const sellerWallet = { id: 'wallet-1', userId: SELLER_ID, address: 'rSellerAddress', isPrimary: true }

const listingSummary = {
  id: 'listing-1',
  slug: 'asset-1',
  title: 'Asset 1',
  thumbnailCid: null,
  sellerId: SELLER_ID,
  distributionMode: 'unlimited',
  maxDownloads: null,
}

const pendingOrder = {
  id: 'order-1',
  buyerId: BUYER_ID,
  listingId: 'listing-1',
  txHash: 'pending:00000000-0000-0000-0000-000000000000',
  amountPaid: 5,
  status: 'Pending',
  paymentAddress: 'rSellerAddress',
  paymentTag: 42,
  purchasedAt: PURCHASED_AT,
  listing: listingSummary,
}

const pagination = { page: 1, limit: 20, skip: 0 }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createOrder', () => {
  function mockHappyPath() {
    listingFindFirst.mockResolvedValue(publishedListing as never)
    walletFindFirst.mockResolvedValue(sellerWallet as never)
    purchaseCreate.mockResolvedValue({ id: 'order-1', status: 'Pending', purchasedAt: PURCHASED_AT } as never)
  }

  it('creates a pending order with payment instructions incl. a DestinationTag', async () => {
    mockHappyPath()

    const order = await createOrder(BUYER_ID, { assetId: 'listing-1' })

    expect(order).toMatchObject({
      id: 'order-1',
      status: 'Pending',
      amount: 5,
      currency: 'XRP',
      paymentAddress: 'rSellerAddress',
    })
    expect(order.paymentTag).toBeTypeOf('number')
    expect(order.paymentTag).toBeGreaterThanOrEqual(0)
    // Must fit a Postgres INT4 (the payment_tag column), not just a uint32.
    expect(order.paymentTag).toBeLessThanOrEqual(2 ** 31 - 1)
    expect(Number.isInteger(order.paymentTag)).toBe(true)
    expect(order.expiresAt).toEqual(new Date('2026-01-01T00:30:00Z'))
    const createArgs = purchaseCreate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(createArgs.data.txHash).toMatch(/^pending:[0-9a-f-]{36}$/)
    expect(createArgs.data).toMatchObject({
      buyerId: BUYER_ID,
      listingId: 'listing-1',
      amountPaid: 5,
      paymentAddress: 'rSellerAddress',
      paymentTag: order.paymentTag,
    })
  })

  it('rejects a missing assetId', async () => {
    await expect(createOrder(BUYER_ID, {})).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(listingFindFirst).not.toHaveBeenCalled()
  })

  it('rejects an unknown or deleted listing with 404', async () => {
    listingFindFirst.mockResolvedValue(null)
    await expect(createOrder(BUYER_ID, { assetId: 'nope' })).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('rejects a non-published listing with 404', async () => {
    listingFindFirst.mockResolvedValue({ ...publishedListing, status: 'Draft' } as never)
    await expect(createOrder(BUYER_ID, { assetId: 'listing-1' })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
  })

  it('rejects buying your own asset', async () => {
    listingFindFirst.mockResolvedValue({ ...publishedListing, sellerId: BUYER_ID } as never)
    await expect(createOrder(BUYER_ID, { assetId: 'listing-1' })).rejects.toMatchObject(
      new AppError(400, 'VALIDATION_ERROR', 'Impossible d\'acheter votre propre asset'),
    )
  })

  it('rejects an order on a free asset', async () => {
    listingFindFirst.mockResolvedValue({ ...publishedListing, isFree: true } as never)
    await expect(createOrder(BUYER_ID, { assetId: 'listing-1' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })

  it('rejects a paid asset without a price', async () => {
    listingFindFirst.mockResolvedValue({ ...publishedListing, price: null } as never)
    await expect(createOrder(BUYER_ID, { assetId: 'listing-1' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })

  it('rejects a non-positive price', async () => {
    listingFindFirst.mockResolvedValue({ ...publishedListing, price: 0 } as never)
    await expect(createOrder(BUYER_ID, { assetId: 'listing-1' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })

  it('rejects a listing priced in a non-XRP currency', async () => {
    listingFindFirst.mockResolvedValue({ ...publishedListing, currency: 'EUR' } as never)
    await expect(createOrder(BUYER_ID, { assetId: 'listing-1' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })

  it('rejects a limited listing whose confirmed purchases reached maxDownloads', async () => {
    listingFindFirst.mockResolvedValue(
      { ...publishedListing, distributionMode: 'limited', maxDownloads: 2 } as never,
    )
    purchaseCount.mockResolvedValue(2 as never)

    await expect(createOrder(BUYER_ID, { assetId: 'listing-1' })).rejects.toMatchObject({
      status: 410,
      code: 'MAX_DOWNLOADS_REACHED',
    })
    expect(purchaseCount).toHaveBeenCalledWith({ where: { listingId: 'listing-1', status: 'Confirmed' } })
  })

  it('accepts a limited listing below its maxDownloads', async () => {
    mockHappyPath()
    listingFindFirst.mockResolvedValue(
      { ...publishedListing, distributionMode: 'limited', maxDownloads: 2 } as never,
    )
    purchaseCount.mockResolvedValue(1 as never)

    const order = await createOrder(BUYER_ID, { assetId: 'listing-1' })
    expect(order.status).toBe('Pending')
  })

  it('rejects when the seller has no primary wallet', async () => {
    listingFindFirst.mockResolvedValue(publishedListing as never)
    walletFindFirst.mockResolvedValue(null)

    await expect(createOrder(BUYER_ID, { assetId: 'listing-1' })).rejects.toMatchObject({
      status: 400,
      code: 'WALLET_NOT_LINKED',
    })
    expect(purchaseCreate).not.toHaveBeenCalled()
  })
})

describe('listOrders', () => {
  it('returns my orders newest first with a listing summary and meta', async () => {
    purchaseFindMany.mockResolvedValue([pendingOrder] as never)
    purchaseCount.mockResolvedValue(1 as never)

    const { items, meta } = await listOrders(BUYER_ID, pagination)

    expect(items).toEqual([
      {
        id: 'order-1',
        status: 'Pending',
        amount: 5,
        // Placeholder hashes are internal — exposed as null until confirmation.
        txHash: null,
        purchasedAt: PURCHASED_AT,
        listing: { id: 'listing-1', slug: 'asset-1', title: 'Asset 1', thumbnailCid: null },
      },
    ])
    expect(meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 })
    expect(purchaseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { buyerId: BUYER_ID },
        orderBy: { purchasedAt: 'desc' },
        skip: 0,
        take: 20,
      }),
    )
  })
})

describe('getPendingOrderForAsset', () => {
  it('returns the newest pending order with the payment instructions needed after a refresh', async () => {
    purchaseFindFirst.mockResolvedValue({
      ...pendingOrder,
      listing: { ...listingSummary, currency: 'XRP' },
    } as never)

    const order = await getPendingOrderForAsset(BUYER_ID, 'listing-1')

    expect(order).toMatchObject({
      id: 'order-1',
      status: 'Pending',
      currency: 'XRP',
      paymentAddress: 'rSellerAddress',
      paymentTag: 42,
      expiresAt: new Date('2026-01-01T00:30:00Z'),
    })
    expect(purchaseFindFirst).toHaveBeenCalledWith({
      where: { buyerId: BUYER_ID, listingId: 'listing-1', status: 'Pending' },
      include: expect.any(Object),
      orderBy: { purchasedAt: 'desc' },
    })
  })

  it('returns null when the buyer has no pending order for the asset', async () => {
    purchaseFindFirst.mockResolvedValue(null)
    await expect(getPendingOrderForAsset(BUYER_ID, 'listing-1')).resolves.toBeNull()
  })
})

describe('getOrder', () => {
  it('returns an order owned by the caller', async () => {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    const order = await getOrder(BUYER_ID, 'order-1')
    expect(order).toMatchObject({ id: 'order-1', status: 'Pending', txHash: null })
  })

  it('returns 404 for an unknown order', async () => {
    purchaseFindFirst.mockResolvedValue(null)
    await expect(getOrder(BUYER_ID, 'nope')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('returns 404 when the caller is not the buyer', async () => {
    purchaseFindFirst.mockResolvedValue({ ...pendingOrder, buyerId: 'someone-else' } as never)
    await expect(getOrder(BUYER_ID, 'order-1')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })
})

describe('confirmOrder', () => {
  function mockHappyPath() {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    verifyPayment.mockResolvedValue(undefined)
    purchaseUpdateMany.mockResolvedValue({ count: 1 } as never)
  }

  it('verifies the payment on-chain (snapshotted address + tag) then confirms with the normalized txHash', async () => {
    mockHappyPath()

    const order = await confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)

    expect(verifyPayment).toHaveBeenCalledWith({
      txHash: NORMALIZED_TX_HASH,
      destination: 'rSellerAddress',
      destinationTag: 42,
      minAmountXrp: 5,
    })
    expect(purchaseUpdateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', status: 'Pending' },
      data: { status: 'Confirmed', txHash: NORMALIZED_TX_HASH },
    })
    expect(order).toMatchObject({ id: 'order-1', status: 'Confirmed', txHash: NORMALIZED_TX_HASH })
    // The seller's current wallet must NOT be re-resolved: the snapshot is used.
    expect(walletFindFirst).not.toHaveBeenCalled()
  })

  it('rejects a missing txHash', async () => {
    await expect(confirmOrder(BUYER_ID, 'order-1', undefined)).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    expect(purchaseFindFirst).not.toHaveBeenCalled()
  })

  it('rejects a malformed txHash before any lookup', async () => {
    await expect(confirmOrder(BUYER_ID, 'order-1', 'not-a-hash')).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    expect(purchaseFindFirst).not.toHaveBeenCalled()
  })

  it('returns 404 when the caller is not the buyer', async () => {
    purchaseFindFirst.mockResolvedValue({ ...pendingOrder, buyerId: 'someone-else' } as never)
    await expect(confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)).rejects.toMatchObject({ status: 404 })
  })

  it('rejects a non-pending order', async () => {
    purchaseFindFirst.mockResolvedValue({ ...pendingOrder, status: 'Cancelled' } as never)
    await expect(confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)).rejects.toMatchObject({
      status: 409,
      code: 'ORDER_NOT_PENDING',
    })
    expect(verifyPayment).not.toHaveBeenCalled()
  })

  it('re-checks limited stock at confirm and rejects an oversell', async () => {
    purchaseFindFirst.mockResolvedValue({
      ...pendingOrder,
      listing: { ...listingSummary, distributionMode: 'limited', maxDownloads: 1 },
    } as never)
    purchaseCount.mockResolvedValue(1 as never)

    await expect(confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)).rejects.toMatchObject({
      status: 410,
      code: 'MAX_DOWNLOADS_REACHED',
    })
    expect(verifyPayment).not.toHaveBeenCalled()
  })

  it('propagates the on-chain verification failure and leaves the order untouched', async () => {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    verifyPayment.mockRejectedValue(new AppError(400, 'TX_NOT_VALIDATED', 'Transaction non encore validée'))

    await expect(confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)).rejects.toMatchObject({
      status: 400,
      code: 'TX_NOT_VALIDATED',
    })
    expect(purchaseUpdateMany).not.toHaveBeenCalled()
  })

  it('maps a txHash unique violation to 409 TX_ALREADY_USED', async () => {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    verifyPayment.mockResolvedValue(undefined)
    purchaseUpdateMany.mockRejectedValue({ code: 'P2002' })

    await expect(confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)).rejects.toMatchObject({
      status: 409,
      code: 'TX_ALREADY_USED',
    })
  })

  it('rejects when a concurrent transition already resolved the order (0 rows affected)', async () => {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    verifyPayment.mockResolvedValue(undefined)
    purchaseUpdateMany.mockResolvedValue({ count: 0 } as never)

    await expect(confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)).rejects.toMatchObject({
      status: 409,
      code: 'ORDER_NOT_PENDING',
    })
  })

  it('rethrows non-unique-violation update errors untouched', async () => {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    verifyPayment.mockResolvedValue(undefined)
    purchaseUpdateMany.mockRejectedValue(new Error('db down'))

    await expect(confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)).rejects.toThrow('db down')
  })
})

describe('cancelOrder', () => {
  it('cancels a pending order guarded on its status', async () => {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    purchaseUpdateMany.mockResolvedValue({ count: 1 } as never)

    const order = await cancelOrder(BUYER_ID, 'order-1')

    expect(purchaseUpdateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', status: 'Pending' },
      data: { status: 'Cancelled' },
    })
    expect(order).toMatchObject({ id: 'order-1', status: 'Cancelled' })
  })

  it('rejects when a concurrent transition already resolved the order', async () => {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    purchaseUpdateMany.mockResolvedValue({ count: 0 } as never)
    await expect(cancelOrder(BUYER_ID, 'order-1')).rejects.toMatchObject({ status: 409, code: 'ORDER_NOT_PENDING' })
  })

  it('rejects a non-pending order', async () => {
    purchaseFindFirst.mockResolvedValue({ ...pendingOrder, status: 'Confirmed' } as never)
    await expect(cancelOrder(BUYER_ID, 'order-1')).rejects.toMatchObject({ status: 409, code: 'ORDER_NOT_PENDING' })
    expect(purchaseUpdateMany).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown order', async () => {
    purchaseFindFirst.mockResolvedValue(null)
    await expect(cancelOrder(BUYER_ID, 'nope')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })
})
