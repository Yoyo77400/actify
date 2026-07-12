import { AppError } from '../../utils/http'

const DEFAULT_XRPL_RPC_URL = 'https://s.altnet.rippletest.net:51234/'
const TXN_NOT_FOUND_ERROR = 'txnNotFound'
const NFT_MINT_TX_TYPE = 'NFTokenMint'
const TX_SUCCESS_RESULT = 'tesSUCCESS'

export interface XrplMintInput {
  txHash: string
  /** Accounts allowed to have signed the mint (the creator's linked wallets). */
  minters: string[]
  /** The exact NFTokenMint fields the backend told the wallet to mint, so the
   *  on-chain token is bound to THIS asset (not any other NFT the creator owns). */
  expectedUriHex: string
  expectedTaxon: number
  expectedTransferFee: number
}

export interface XrplMintResult {
  nftokenId: string
  issuer: string
  uriHex: string
}

interface XrplTxResult {
  error?: string
  validated?: boolean
  TransactionType?: string
  Account?: string
  Issuer?: string
  URI?: string
  NFTokenTaxon?: number
  TransferFee?: number
  meta?: { TransactionResult?: string; nftoken_id?: string }
}

/**
 * Verifies on the XRP Ledger (JSON-RPC `tx`) that `txHash` is a validated,
 * successful NFTokenMint signed by `minter`, and returns the authoritative
 * NFTokenID re-derived from the transaction metadata (never trusting the
 * client-supplied id). Throws an AppError describing the first failed check.
 *
 * rippled 1.11+ (Testnet runs 2.x) includes meta.nftoken_id directly for
 * NFTokenMint, so no AffectedNodes diffing is needed on this network.
 */
export async function verifyXrplMint(input: XrplMintInput): Promise<XrplMintResult> {
  const rpcUrl = process.env.XRPL_RPC_URL ?? DEFAULT_XRPL_RPC_URL

  let result: XrplTxResult | undefined
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'tx', params: [{ transaction: input.txHash, binary: false }] }),
    })
    if (!response.ok) {
      throw new Error(`XRPL RPC HTTP ${response.status}`)
    }
    result = ((await response.json()) as { result?: XrplTxResult }).result
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(502, 'TX_LOOKUP_FAILED', 'Vérification du mint XRPL impossible')
  }

  if (!result || result.error) {
    if (result?.error === TXN_NOT_FOUND_ERROR) {
      throw new AppError(404, 'TX_NOT_FOUND', 'Transaction de mint introuvable sur le ledger XRPL')
    }
    throw new AppError(502, 'TX_LOOKUP_FAILED', 'Vérification du mint XRPL impossible')
  }

  if (result.validated !== true) {
    throw new AppError(400, 'TX_NOT_VALIDATED', 'Transaction de mint non encore validée par le ledger XRPL')
  }
  if (result.TransactionType !== NFT_MINT_TX_TYPE) {
    throw new AppError(400, 'TX_NOT_MINT', "La transaction n'est pas un NFTokenMint")
  }
  if (!result.Account || !input.minters.includes(result.Account)) {
    throw new AppError(400, 'TX_WRONG_MINTER', "Le mint n'a pas été signé par l'un de vos wallets liés")
  }
  if (result.meta?.TransactionResult !== TX_SUCCESS_RESULT) {
    throw new AppError(400, 'TX_FAILED', 'Le mint a échoué sur le ledger XRPL')
  }

  // Bind the on-chain token to THIS asset: the mint must carry the exact URI
  // (hex), taxon and royalty the backend issued in the intent. Otherwise a
  // creator could confirm an unrelated NFTokenMint they own and misrepresent
  // the asset's content to buyers.
  if ((result.URI ?? '').toUpperCase() !== input.expectedUriHex.toUpperCase()) {
    throw new AppError(400, 'TX_URI_MISMATCH', "Le NFT minté ne correspond pas au contenu de cet asset")
  }
  if ((result.NFTokenTaxon ?? 0) !== input.expectedTaxon) {
    throw new AppError(400, 'TX_PARAMS_MISMATCH', 'Le taxon du NFT minté ne correspond pas')
  }
  if ((result.TransferFee ?? 0) !== input.expectedTransferFee) {
    throw new AppError(400, 'TX_PARAMS_MISMATCH', 'Les royalties du NFT minté ne correspondent pas')
  }

  const nftokenId = result.meta.nftoken_id
  if (!nftokenId) {
    throw new AppError(502, 'MINT_ID_MISSING', 'Impossible de lire le NFTokenID sur le ledger XRPL')
  }

  // On a self-mint the issuer is the minting account; an explicit Issuer field
  // only appears when minting on behalf of another account.
  return { nftokenId, issuer: result.Issuer ?? result.Account, uriHex: result.URI ?? '' }
}
