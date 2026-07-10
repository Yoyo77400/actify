export interface WalletSignaturePayload {
  address: string
  publicKey: string
  message: string
  signature: string
}

export interface ChainVerifier {
  // Must confirm both that publicKey derives to address AND that signature
  // is valid over message for that key. Never throws — false on any failure.
  verify(payload: WalletSignaturePayload): boolean
}
