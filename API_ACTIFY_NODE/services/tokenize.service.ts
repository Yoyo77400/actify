import { prisma } from './prisma'
import { AppError } from '../utils/http'
import { verifyXrplMint } from './chains/xrpl-mint'

// XLS-20 NFTokenMint flag: the token can be transferred to others (required
// for a marketplace and for a royalty via TransferFee).
const FLAG_TRANSFERABLE = 8
// TransferFee is in units of 0.001%; royaltyPercentage (e.g. 2.5) → 2500.
const TRANSFER_FEE_PER_PERCENT = 1000
const MAX_TRANSFER_FEE = 50000
const PRISMA_UNIQUE_VIOLATION = 'P2002'

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === PRISMA_UNIQUE_VIOLATION
}

function stringToHex(input: string): string {
  return Buffer.from(input, 'utf8').toString('hex').toUpperCase()
}

async function getOwnedListingOrThrow(userId: string, listingId: string) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    include: { nft: true },
  })
  if (!listing || listing.sellerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }
  return listing
}

async function getMinterAddresses(userId: string): Promise<string[]> {
  const wallets = await prisma.wallet.findMany({ where: { userId }, select: { address: true } })
  if (wallets.length === 0) {
    throw new AppError(400, 'WALLET_NOT_LINKED', 'Liez un wallet avant de tokeniser un asset')
  }
  return wallets.map((w) => w.address)
}

/**
 * Returns the NFTokenMint parameters the creator's wallet must sign to
 * tokenize the asset. The URI points at the asset's IPFS content (hex-encoded
 * per XLS-20), the TransferFee carries the royalty, and the taxon groups the
 * creator's assets. The wallet fills Account and submits.
 */
export async function buildMintIntent(userId: string, listingId: string) {
  const listing = await getOwnedListingOrThrow(userId, listingId)
  if (listing.nft) {
    throw new AppError(409, 'ALREADY_TOKENIZED', 'Cet asset est déjà tokenisé')
  }

  const royaltyPercent = listing.royaltyPercentage != null ? Number(listing.royaltyPercentage) : 0
  const transferFee = Math.min(MAX_TRANSFER_FEE, Math.round(royaltyPercent * TRANSFER_FEE_PER_PERCENT))

  // Point the NFT at its content when available, else at a stable Actify
  // reference. Not validated on-chain, so kept short (URI blob ≤ 256 bytes).
  const uri = listing.fileIpfsCid ? `ipfs://${listing.fileIpfsCid}` : `actify:asset:${listing.id}`

  return {
    nftokenTaxon: 0,
    uri,
    uriHex: stringToHex(uri),
    flags: FLAG_TRANSFERABLE,
    transferFee,
    minters: await getMinterAddresses(userId),
  }
}

/**
 * Records the on-chain mint after the wallet has signed and submitted it.
 * The txHash is re-verified against XRPL and the NFTokenID re-derived from the
 * validated transaction — the client-supplied id is never trusted.
 */
export async function confirmMint(userId: string, listingId: string, txHash: unknown) {
  if (typeof txHash !== 'string' || !/^[0-9A-Fa-f]{64}$/.test(txHash)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'txHash doit être un hash de transaction XRPL (64 caractères hexadécimaux)')
  }
  const normalizedTxHash = txHash.toUpperCase()

  const listing = await getOwnedListingOrThrow(userId, listingId)
  if (listing.nft) {
    throw new AppError(409, 'ALREADY_TOKENIZED', 'Cet asset est déjà tokenisé')
  }

  const minters = await getMinterAddresses(userId)
  const uri = listing.fileIpfsCid ? `ipfs://${listing.fileIpfsCid}` : `actify:asset:${listing.id}`

  const { nftokenId, issuer } = await verifyXrplMint({ txHash: normalizedTxHash, minters })

  const nft = await prisma.nft
    .create({
      data: {
        listingId: listing.id,
        nftokenId,
        issuer,
        taxon: 0,
        uri,
        mintTxHash: normalizedTxHash,
        currentOwnerId: userId,
      },
    })
    .catch((err: unknown) => {
      if (isUniqueViolation(err)) {
        throw new AppError(409, 'ALREADY_TOKENIZED', 'Ce mint a déjà été enregistré')
      }
      throw err
    })

  return { nftokenId: nft.nftokenId, issuer: nft.issuer, mintTxHash: nft.mintTxHash, mintedAt: nft.mintedAt }
}
