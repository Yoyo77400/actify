import { AppError } from '../../utils/http'
import type { ChainVerifier } from './types'
import { xrplVerifier } from './xrpl'

// Add a new chain by dropping a verifier here — nothing else in the wallet
// flow (challenge/verify/link/login) needs to know which chains exist.
const verifiers: Record<string, ChainVerifier> = {
  xrpl: xrplVerifier,
}

export function getChainVerifier(chain: string): ChainVerifier {
  const verifier = verifiers[chain]
  if (!verifier) {
    throw new AppError(400, 'UNSUPPORTED_CHAIN', `Chaîne non supportée : ${chain}`)
  }
  return verifier
}

export type { ChainVerifier, WalletSignaturePayload } from './types'
