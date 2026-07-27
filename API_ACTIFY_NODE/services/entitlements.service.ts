import { prisma } from './prisma'
import { accountOwnsNft } from './chains/xrpl-nft'

const PURCHASE_CONFIRMED = 'Confirmed'
// A user can link any number of wallets, and this check runs on the public
// asset detail route, which carries no rate limiter. Without a cap the fan-out
// multiplier would be client-controlled: link 50 wallets, and every page view
// becomes 50 XRPL page-chains. Three covers hot/cold/spare, the realistic
// spread for a collector.
const MAX_WALLETS_CHECKED = 3

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

  const wallets = await prisma.wallet.findMany({
    where: { userId },
    select: { address: true },
    // Primary first: the wallet a buyer transacts with is the likeliest holder,
    // so it is never the one dropped by the cap.
    orderBy: { isPrimary: 'desc' },
    take: MAX_WALLETS_CHECKED,
  })

  // Concurrent, not sequential: wall-clock is then one page-chain, not N.
  const held = await Promise.all(wallets.map((wallet) => accountOwnsNft(wallet.address, nft.nftokenId)))
  return held.includes(true)
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
