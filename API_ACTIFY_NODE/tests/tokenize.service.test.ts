import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findFirst: vi.fn() },
    wallet: { findMany: vi.fn() },
    nft: { create: vi.fn() },
  },
}))

vi.mock('../services/chains/xrpl-mint', () => ({
  verifyXrplMint: vi.fn(),
}))

import { prisma } from '../services/prisma'
import { verifyXrplMint } from '../services/chains/xrpl-mint'
import { buildMintIntent, confirmMint } from '../services/tokenize.service'

const listingFindFirst = vi.mocked(prisma.listing.findFirst)
const walletFindMany = vi.mocked(prisma.wallet.findMany)
const nftCreate = vi.mocked(prisma.nft.create)
const verifyMint = vi.mocked(verifyXrplMint)

const CREATOR = 'creator-1'
const TX_HASH = 'a'.repeat(64)
const NFTOKEN_ID = '000800001234'

const draftListing = {
  id: 'listing-1',
  sellerId: CREATOR,
  status: 'Draft',
  deletedAt: null,
  fileIpfsCid: 'QmFileCid',
  royaltyPercentage: 2.5,
  nft: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  walletFindMany.mockResolvedValue([{ address: 'rCreatorWallet' }] as never)
})

describe('buildMintIntent', () => {
  it('returns NFTokenMint params with the royalty encoded as TransferFee and a hex URI', async () => {
    listingFindFirst.mockResolvedValue(draftListing as never)

    const intent = await buildMintIntent(CREATOR, 'listing-1')

    // 2.5% royalty → TransferFee 2500 (units of 0.001%).
    expect(intent.transferFee).toBe(2500)
    expect(intent.flags).toBe(8) // tfTransferable
    // Files are stored by Actify, so the NFT URI is a stable Actify reference.
    expect(intent.uri).toBe('actify:asset:listing-1')
    expect(intent.uriHex).toBe(Buffer.from('actify:asset:listing-1', 'utf8').toString('hex').toUpperCase())
    expect(intent.minters).toEqual(['rCreatorWallet'])
    expect(intent.nftokenTaxon).toBe(0)
  })

  it('caps TransferFee at 50000 for an out-of-range royalty', async () => {
    listingFindFirst.mockResolvedValue({ ...draftListing, royaltyPercentage: 90 } as never)
    const intent = await buildMintIntent(CREATOR, 'listing-1')
    expect(intent.transferFee).toBe(50000)
  })

  it('404s for a listing the caller does not own', async () => {
    listingFindFirst.mockResolvedValue({ ...draftListing, sellerId: 'someone-else' } as never)
    await expect(buildMintIntent(CREATOR, 'listing-1')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('409s when the asset is already tokenized', async () => {
    listingFindFirst.mockResolvedValue({ ...draftListing, nft: { id: 'nft-1' } } as never)
    await expect(buildMintIntent(CREATOR, 'listing-1')).rejects.toMatchObject({ status: 409, code: 'ALREADY_TOKENIZED' })
  })

  it('400s when the creator has no linked wallet', async () => {
    listingFindFirst.mockResolvedValue(draftListing as never)
    walletFindMany.mockResolvedValue([] as never)
    await expect(buildMintIntent(CREATOR, 'listing-1')).rejects.toMatchObject({ status: 400, code: 'WALLET_NOT_LINKED' })
  })
})

describe('confirmMint', () => {
  it('re-verifies the mint on-chain (with the asset-binding params) and records the NFT', async () => {
    listingFindFirst.mockResolvedValue(draftListing as never)
    verifyMint.mockResolvedValue({ nftokenId: NFTOKEN_ID, issuer: 'rCreatorWallet', uriHex: 'AB' })
    nftCreate.mockResolvedValue({
      nftokenId: NFTOKEN_ID,
      issuer: 'rCreatorWallet',
      mintTxHash: TX_HASH.toUpperCase(),
      mintedAt: new Date('2026-07-12'),
    } as never)

    const result = await confirmMint(CREATOR, 'listing-1', TX_HASH)

    const expectedUriHex = Buffer.from('actify:asset:listing-1', 'utf8').toString('hex').toUpperCase()
    expect(verifyMint).toHaveBeenCalledWith({
      txHash: TX_HASH.toUpperCase(),
      minters: ['rCreatorWallet'],
      expectedUriHex,
      expectedTaxon: 0,
      expectedTransferFee: 2500,
    })
    expect(nftCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ listingId: 'listing-1', nftokenId: NFTOKEN_ID, currentOwnerId: CREATOR }),
      }),
    )
    expect(result).toMatchObject({ nftokenId: NFTOKEN_ID, issuer: 'rCreatorWallet' })
  })

  it('rejects a malformed txHash before any lookup', async () => {
    await expect(confirmMint(CREATOR, 'listing-1', 'nope')).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(listingFindFirst).not.toHaveBeenCalled()
  })

  it('409s when the asset is already tokenized', async () => {
    listingFindFirst.mockResolvedValue({ ...draftListing, nft: { id: 'nft-1' } } as never)
    await expect(confirmMint(CREATOR, 'listing-1', TX_HASH)).rejects.toMatchObject({ status: 409, code: 'ALREADY_TOKENIZED' })
    expect(verifyMint).not.toHaveBeenCalled()
  })

  it('maps a duplicate mint (unique violation) to 409 ALREADY_TOKENIZED', async () => {
    listingFindFirst.mockResolvedValue(draftListing as never)
    verifyMint.mockResolvedValue({ nftokenId: NFTOKEN_ID, issuer: 'rCreatorWallet', uriHex: 'AB' })
    nftCreate.mockRejectedValue({ code: 'P2002' })
    await expect(confirmMint(CREATOR, 'listing-1', TX_HASH)).rejects.toMatchObject({ status: 409, code: 'ALREADY_TOKENIZED' })
  })
})
