export type WalletId = 'gemwallet' | 'crossmark'

export interface WalletConnection {
  address: string
  publicKey: string
}

// Parameters for an XLS-20 NFTokenMint, produced by the backend tokenize
// intent. The backend re-derives the NFTokenID from the validated tx, so the
// adapter only needs to return the transaction hash.
export interface MintNftParams {
  account: string
  uriHex: string
  nftokenTaxon: number
  flags: number
  transferFee: number
}

export interface WalletAdapter {
  id: WalletId
  label: string
  icon: string
  installUrl?: string
  /** Whether the wallet can be used right now (extension injected, …). Client-only. */
  isAvailable(): Promise<boolean>
  /** Opens the wallet and returns the account the user picked. */
  connect(): Promise<WalletConnection>
  /**
   * Asks the wallet to sign the challenge message (raw UTF-8 string).
   * Returns the signature as hex, verifiable server-side with ripple-keypairs
   * against `hex(utf8(message))`.
   */
  signMessage(message: string): Promise<string>
  /** Signs + submits an NFTokenMint; returns the resulting tx hash. */
  mintNft(params: MintNftParams): Promise<{ txHash: string }>
}

// tfTransferable = 8: the marketplace/royalty flag Actify always mints with.
export function flagsToGemwallet(flags: number): { tfTransferable?: boolean; tfBurnable?: boolean; tfOnlyXRP?: boolean } {
  return {
    tfTransferable: (flags & 8) !== 0,
    tfBurnable: (flags & 1) !== 0,
    tfOnlyXRP: (flags & 2) !== 0,
  }
}

export class WalletRejectedError extends Error {
  constructor() {
    super('Demande refusée dans le wallet')
    this.name = 'WalletRejectedError'
  }
}

export function utf8ToHex(input: string): string {
  return Array.from(new TextEncoder().encode(input))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}
