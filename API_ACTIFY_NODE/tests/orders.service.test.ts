import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../utils/http'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findFirst: vi.fn() },
    purchase: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    wallet: { findFirst: vi.fn() },
  },
}))

vi.mock('../services/chains/xrpl-payment', () => ({
  verifyXrplPayment: vi.fn(),
}))

import { prisma } from '../services/prisma'
import { verifyXrplPayment } from '../services/chains/xrpl-payment'
import { cancelOrder, confirmOrder, createOrder, getOrder, listOrders } from '../services/orders.service'

const listingFindFirst = vi.mocked(prisma.listing.findFirst)
const purchaseCount = vi.mocked(prisma.purchase.count)
const purchaseCreate = vi.mocked(prisma.purchase.create)
const purchaseFindFirst = vi.mocked(prisma.purchase.findFirst)
const purchaseFindMany = vi.mocked(prisma.purchase.findMany)
const purchaseUpdate = vi.mocked(prisma.purchase.update)
const walletFindFirst = vi.mocked(prisma.wallet.findFirst)
const verifyPayment = vi.mocked(verifyXrplPayment)

const BUYER_ID = 'buyer-1'
const SELLER_ID = 'seller-1'
const PURCHASED_AT = new Date('2026-01-01T00:00:00Z')

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

const listingSummary = { id: 'listing-1', slug: 'asset-1', title: 'Asset 1', thumbnailCid: null, sellerId: SELLER_ID }

const pendingOrder = {
  id: 'order-1',
  buyerId: BUYER_ID,
  listingId: 'listing-1',
  txHash: 'pending:00000000-0000-0000-0000-000000000000',
  amountPaid: 5,
  status: 'Pending',
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

  it('creates a pending order with payment instructions', async () => {
    mockHappyPath()

    const order = await createOrder(BUYER_ID, { assetId: 'listing-1' })

    expect(order).toEqual({
      id: 'order-1',
      status: 'Pending',
      amount: 5,
      currency: 'XRP',
      paymentAddress: 'rSellerAddress',
      expiresAt: new Date('2026-01-01T00:30:00Z'),
    })
    const createArgs = purchaseCreate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(createArgs.data.txHash).toMatch(/^pending:[0-9a-f-]{36}$/)
    expect(createArgs.data).toMatchObject({ buyerId: BUYER_ID, listingId: 'listing-1', amountPaid: 5 })
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
  const REAL_TX_HASH = 'DEADBEEF'

  function mockHappyPath() {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    walletFindFirst.mockResolvedValue(sellerWallet as never)
    verifyPayment.mockResolvedValue(undefined)
    purchaseUpdate.mockResolvedValue({ ...pendingOrder, status: 'Confirmed', txHash: REAL_TX_HASH } as never)
  }

  it('verifies the payment on-chain then confirms the order with the real txHash', async () => {
    mockHappyPath()

    const order = await confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)

    expect(verifyPayment).toHaveBeenCalledWith({
      txHash: REAL_TX_HASH,
      destination: 'rSellerAddress',
      minAmountXrp: 5,
    })
    expect(purchaseUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'Confirmed', txHash: REAL_TX_HASH },
    })
    expect(order).toMatchObject({ id: 'order-1', status: 'Confirmed', txHash: REAL_TX_HASH })
  })

  it('rejects a missing txHash', async () => {
    await expect(confirmOrder(BUYER_ID, 'order-1', undefined)).rejects.toMatchObject({
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

  it('rejects when the seller has no primary wallet', async () => {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    walletFindFirst.mockResolvedValue(null)
    await expect(confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)).rejects.toMatchObject({
      status: 400,
      code: 'WALLET_NOT_LINKED',
    })
  })

  it('propagates the on-chain verification failure and leaves the order untouched', async () => {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    walletFindFirst.mockResolvedValue(sellerWallet as never)
    verifyPayment.mockRejectedValue(new AppError(400, 'TX_NOT_VALIDATED', 'Transaction non encore validée'))

    await expect(confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)).rejects.toMatchObject({
      status: 400,
      code: 'TX_NOT_VALIDATED',
    })
    expect(purchaseUpdate).not.toHaveBeenCalled()
  })

  it('maps a txHash unique violation to 409 TX_ALREADY_USED', async () => {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    walletFindFirst.mockResolvedValue(sellerWallet as never)
    verifyPayment.mockResolvedValue(undefined)
    purchaseUpdate.mockRejectedValue({ code: 'P2002' })

    await expect(confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)).rejects.toMatchObject({
      status: 409,
      code: 'TX_ALREADY_USED',
    })
  })

  it('rethrows non-unique-violation update errors untouched', async () => {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    walletFindFirst.mockResolvedValue(sellerWallet as never)
    verifyPayment.mockResolvedValue(undefined)
    purchaseUpdate.mockRejectedValue(new Error('db down'))

    await expect(confirmOrder(BUYER_ID, 'order-1', REAL_TX_HASH)).rejects.toThrow('db down')
  })
})

describe('cancelOrder', () => {
  it('cancels a pending order', async () => {
    purchaseFindFirst.mockResolvedValue(pendingOrder as never)
    purchaseUpdate.mockResolvedValue({ ...pendingOrder, status: 'Cancelled' } as never)

    const order = await cancelOrder(BUYER_ID, 'order-1')

    expect(purchaseUpdate).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { status: 'Cancelled' } })
    expect(order).toMatchObject({ id: 'order-1', status: 'Cancelled' })
  })

  it('rejects a non-pending order', async () => {
    purchaseFindFirst.mockResolvedValue({ ...pendingOrder, status: 'Confirmed' } as never)
    await expect(cancelOrder(BUYER_ID, 'order-1')).rejects.toMatchObject({ status: 409, code: 'ORDER_NOT_PENDING' })
    expect(purchaseUpdate).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown order', async () => {
    purchaseFindFirst.mockResolvedValue(null)
    await expect(cancelOrder(BUYER_ID, 'nope')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })
})
