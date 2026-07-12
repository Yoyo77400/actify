export type WalletId = 'gemwallet' | 'crossmark'

export interface WalletConnection {
  address: string
  publicKey: string
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
