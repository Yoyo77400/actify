import { prisma } from './prisma'
import { accountOwnsNft } from './chains/xrpl-nft'

const PURCHASE_CONFIRMED = 'Confirmed'

/** Why a user may download an asset. */
export type EntitlementReason = 'free' | 'purchase' | 'nft_owner'

export interface EntitlementListing {
  id: string
  isFree: boolean
}

// Does one of the user's linked wallets hold this asset's NFToken right now?
// The DB records who minted it, not who holds it — only the ledger knows after
// a transfer, so that is what we ask.
async function ownsListingNft(userId: string, listingId: string): Promise<boolean> {
  const nft = await prisma.nft.findUnique({ where: { listingId }, select: { nftokenId: true } })
  if (!nft) return false

  const wallets = await prisma.wallet.findMany({ where: { userId }, select: { address: true } })
  for (const wallet of wallets) {
    if (await accountOwnsNft(wallet.address, nft.nftokenId)) return true
  }
  return false
}

/**
 * Resolves why `userId` may download `listing`, or null when nothing entitles
 * them. Single source of truth shared by the download endpoints (which enforce
 * it) and the asset detail view (which surfaces it so the UI knows whether to
 * offer the button).
 *
 * Ordered cheapest-first: the on-chain lookup only runs for a paid asset the
 * user has not bought through Actify.
 */
export async function resolveEntitlement(
  userId: string,
  listing: EntitlementListing,
): Promise<EntitlementReason | null> {
  if (listing.isFree) {
    return 'free'
  }

  const purchase = await prisma.purchase.findFirst({
    where: { buyerId: userId, listingId: listing.id, status: PURCHASE_CONFIRMED },
  })
  if (purchase) {
    return 'purchase'
  }

  return (await ownsListingNft(userId, listing.id)) ? 'nft_owner' : null
}
