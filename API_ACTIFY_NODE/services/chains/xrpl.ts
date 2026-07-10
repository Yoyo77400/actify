import { deriveAddress, verify as verifySignature } from 'ripple-keypairs'
import type { ChainVerifier, WalletSignaturePayload } from './types'

// XRPL addresses are a hash of the public key, not the key itself, so the
// caller must supply publicKey alongside address — we derive the address
// from it and reject on mismatch before even checking the signature.
export const xrplVerifier: ChainVerifier = {
  verify({ address, publicKey, message, signature }: WalletSignaturePayload): boolean {
    let derivedAddress: string
    try {
      derivedAddress = deriveAddress(publicKey)
    } catch {
      return false
    }
    if (derivedAddress !== address) {
      return false
    }

    const messageHex = Buffer.from(message, 'utf8').toString('hex')
    try {
      return verifySignature(messageHex, signature, publicKey)
    } catch {
      return false
    }
  },
}
