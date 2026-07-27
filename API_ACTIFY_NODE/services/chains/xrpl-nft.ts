import { xrplRpcUrl } from './xrpl-rpc'

const RPC_TIMEOUT_MS = 5000
// account_nfts returns up to 400 objects per page. Five pages cover 2000 NFTs
// held by a single address — far beyond any realistic Actify collector, and a
// hard bound so a whale account can't turn one page view into a long poll.
const MAX_PAGES = 5

interface AccountNftsResult {
  error?: string
  account_nfts?: { NFTokenID?: string }[]
  marker?: unknown
}

/**
 * True when `address` currently holds `nftokenId` on the XRP Ledger.
 *
 * Reads live ledger state rather than Actify's database, so a license acquired
 * outside the marketplace — a secondary sale, a direct transfer — still counts.
 *
 * Fails CLOSED: an unreachable or erroring RPC returns false, never throws. An
 * absent answer is not proof of ownership, and this runs on the asset detail
 * page, which must stay loadable when the ledger is down.
 */
export async function accountOwnsNft(address: string, nftokenId: string): Promise<boolean> {
  const url = xrplRpcUrl()
  let marker: unknown

  for (let page = 0; page < MAX_PAGES; page++) {
    let result: AccountNftsResult | undefined
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          method: 'account_nfts',
          params: [{ account: address, ledger_index: 'validated', ...(marker !== undefined ? { marker } : {}) }],
        }),
        signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
      })
      if (!response.ok) return false
      result = ((await response.json()) as { result?: AccountNftsResult }).result
    } catch {
      return false
    }

    // actNotFound (address never funded) lands here too — it simply owns nothing.
    if (!result || result.error) return false
    if (result.account_nfts?.some((nft) => nft.NFTokenID === nftokenId)) return true
    if (result.marker == null) return false
    marker = result.marker
  }

  return false
}
