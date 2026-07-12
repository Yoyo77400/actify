import { getWalletAdapter, WalletRejectedError, type WalletId } from '~/lib/wallets'
import type { AssetNft, MintIntent } from '~/types/asset'

/**
 * Orchestrates the on-chain tokenization of a Draft asset:
 * backend intent → wallet NFTokenMint → backend confirm (re-verifies the mint
 * and records the NFTokenID). Returns the recorded NFT, or throws.
 */
export function useTokenize() {
  const api = useApi()
  const step = ref<string | null>(null)

  async function tokenize(assetId: string, walletId: WalletId): Promise<AssetNft> {
    const adapter = await getWalletAdapter(walletId)

    step.value = `Ouverture de ${adapter.label}…`
    const { address } = await adapter.connect()

    step.value = 'Préparation du mint…'
    const intent = await api.post<MintIntent>(`/assets/${assetId}/tokenize/intent`)
    if (!intent.minters.includes(address)) {
      throw new WalletRejectedError()
    }

    step.value = `Signature du mint dans ${adapter.label}…`
    const { txHash } = await adapter.mintNft({
      account: address,
      uriHex: intent.uriHex,
      nftokenTaxon: intent.nftokenTaxon,
      flags: intent.flags,
      transferFee: intent.transferFee,
    })

    step.value = 'Vérification on-chain…'
    const nft = await api.post<AssetNft>(`/assets/${assetId}/tokenize/confirm`, { txHash })

    step.value = null
    return nft
  }

  return { step, tokenize }
}
