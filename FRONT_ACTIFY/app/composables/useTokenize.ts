import { getWalletAdapter, WalletRejectedError, type WalletId } from '~/lib/wallets'
import type { AssetNft, MintIntent } from '~/types/asset'

// An NFTokenMint is irreversible: once the wallet has signed and submitted
// it, a retry must re-CONFIRM that same transaction, never sign a second
// mint (double fees + an orphan NFT). Keyed by asset id; client-only state —
// the tokenize flow never runs during SSR.
const pendingMintTxHashes = new Map<string, string>()

// Confirm errors proving the recorded transaction will never become the mint
// of this asset — only then is signing a fresh mint the right retry.
const DEFINITIVE_CONFIRM_ERRORS = new Set([
  'TX_FAILED',
  'TX_NOT_MINT',
  'TX_WRONG_MINTER',
  'TX_URI_MISMATCH',
  'TX_PARAMS_MISMATCH',
  'ALREADY_TOKENIZED',
])

// Confirm waits server-side for XRPL consensus (a few ledgers, ~4s each);
// give it more room than the default 15s API timeout.
const CONFIRM_TIMEOUT_MS = 30_000

/**
 * Orchestrates the on-chain tokenization of a Draft asset:
 * backend intent → wallet NFTokenMint → backend confirm (re-verifies the mint
 * and records the NFTokenID). A retry after a failed confirm reuses the
 * already-signed transaction instead of minting again. Returns the recorded
 * NFT, or throws.
 */
export function useTokenize() {
  const api = useApi()
  const step = ref<string | null>(null)

  async function tokenize(assetId: string, walletId: WalletId): Promise<AssetNft> {
    try {
      let txHash = pendingMintTxHashes.get(assetId)

      if (!txHash) {
        const adapter = await getWalletAdapter(walletId)

        step.value = `Ouverture de ${adapter.label}…`
        const { address } = await adapter.connect()

        step.value = 'Préparation du mint…'
        const intent = await api.post<MintIntent>(`/assets/${assetId}/tokenize/intent`)
        if (!intent.minters.includes(address)) {
          throw new WalletRejectedError(
            `L'adresse ${address} n'est pas liée à votre compte — sélectionnez un wallet lié dans vos réglages.`,
          )
        }

        step.value = `Signature du mint dans ${adapter.label}…`
        const minted = await adapter.mintNft({
          account: address,
          uriHex: intent.uriHex,
          nftokenTaxon: intent.nftokenTaxon,
          flags: intent.flags,
          transferFee: intent.transferFee,
        })
        txHash = minted.txHash
        pendingMintTxHashes.set(assetId, txHash)
      }

      step.value = 'Vérification on-chain…'
      const nft = await api.post<AssetNft>(
        `/assets/${assetId}/tokenize/confirm`,
        { txHash },
        { timeoutMs: CONFIRM_TIMEOUT_MS },
      )
      pendingMintTxHashes.delete(assetId)
      return nft
    } catch (err) {
      const code = toApiError(err)?.code
      if (code && DEFINITIVE_CONFIRM_ERRORS.has(code)) {
        pendingMintTxHashes.delete(assetId)
      }
      throw err
    } finally {
      step.value = null
    }
  }

  return { step, tokenize }
}
