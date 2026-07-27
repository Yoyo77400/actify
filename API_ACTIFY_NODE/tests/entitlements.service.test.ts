import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    purchase: { findFirst: vi.fn() },
    nft: { findUnique: vi.fn() },
    wallet: { findMany: vi.fn() },
  },
}))

vi.mock('../services/chains/xrpl-nft', () => ({ accountOwnsNft: vi.fn() }))

import { prisma } from '../services/prisma'
import { accountOwnsNft } from '../services/chains/xrpl-nft'
import { resolveEntitlement } from '../services/entitlements.service'

const purchaseFindFirst = vi.mocked(prisma.purchase.findFirst)
const nftFindUnique = vi.mocked(prisma.nft.findUnique)
const walletFindMany = vi.mocked(prisma.wallet.findMany)
const ownsNft = vi.mocked(accountOwnsNft)

const NFTOKEN_ID = '0008000047ABCDEF'
const paidListing = { id: 'listing-1', isFree: false }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveEntitlement', () => {
  it('returns "free" without touching the database for a free asset', async () => {
    await expect(resolveEntitlement('user-1', { id: 'listing-1', isFree: true })).resolves.toBe('free')
    expect(purchaseFindFirst).not.toHaveBeenCalled()
    expect(nftFindUnique).not.toHaveBeenCalled()
  })

  it('returns "purchase" on a Confirmed purchase, without querying the ledger', async () => {
    purchaseFindFirst.mockResolvedValue({ id: 'purchase-1' } as never)

    await expect(resolveEntitlement('user-1', paidListing)).resolves.toBe('purchase')
    expect(purchaseFindFirst).toHaveBeenCalledWith({
      where: { buyerId: 'user-1', listingId: 'listing-1', status: 'Confirmed' },
    })
    expect(ownsNft).not.toHaveBeenCalled()
  })

  it('returns "nft_owner" when a linked wallet holds the asset NFToken on-chain', async () => {
    purchaseFindFirst.mockResolvedValue(null)
    nftFindUnique.mockResolvedValue({ nftokenId: NFTOKEN_ID } as never)
    walletFindMany.mockResolvedValue([{ address: 'rBuyer' }] as never)
    ownsNft.mockResolvedValue(true)

    await expect(resolveEntitlement('user-1', paidListing)).resolves.toBe('nft_owner')
    expect(ownsNft).toHaveBeenCalledWith('rBuyer', NFTOKEN_ID)
  })

  it('checks every linked wallet before giving up', async () => {
    purchaseFindFirst.mockResolvedValue(null)
    nftFindUnique.mockResolvedValue({ nftokenId: NFTOKEN_ID } as never)
    walletFindMany.mockResolvedValue([{ address: 'rColdWallet' }, { address: 'rHotWallet' }] as never)
    ownsNft.mockResolvedValueOnce(false).mockResolvedValueOnce(true)

    await expect(resolveEntitlement('user-1', paidListing)).resolves.toBe('nft_owner')
    expect(ownsNft).toHaveBeenCalledTimes(2)
  })

  it('returns null when no wallet holds the NFToken', async () => {
    purchaseFindFirst.mockResolvedValue(null)
    nftFindUnique.mockResolvedValue({ nftokenId: NFTOKEN_ID } as never)
    walletFindMany.mockResolvedValue([{ address: 'rBuyer' }] as never)
    ownsNft.mockResolvedValue(false)

    await expect(resolveEntitlement('user-1', paidListing)).resolves.toBeNull()
  })

  it('returns null without hitting the ledger when the asset is not tokenized', async () => {
    purchaseFindFirst.mockResolvedValue(null)
    nftFindUnique.mockResolvedValue(null)

    await expect(resolveEntitlement('user-1', paidListing)).resolves.toBeNull()
    expect(walletFindMany).not.toHaveBeenCalled()
    expect(ownsNft).not.toHaveBeenCalled()
  })

  it('returns null for a user with no linked wallet', async () => {
    purchaseFindFirst.mockResolvedValue(null)
    nftFindUnique.mockResolvedValue({ nftokenId: NFTOKEN_ID } as never)
    walletFindMany.mockResolvedValue([] as never)

    await expect(resolveEntitlement('user-1', paidListing)).resolves.toBeNull()
    expect(ownsNft).not.toHaveBeenCalled()
  })
})
