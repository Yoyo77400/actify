import { deriveKeypair, deriveAddress, sign } from 'ripple-keypairs'
import { walletDescriptors } from './index'
import { utf8ToHex, WalletRejectedError, type MintNftParams, type WalletAdapter, type WalletId } from './types'

/**
 * In-page test wallet used by the Playwright e2e suite in place of the browser
 * extensions (Crossmark/GemWallet), which cannot be driven in headless CI.
 *
 * This is NOT a mock: it derives a real XRPL keypair from a seed and produces a
 * genuine signature with ripple-keypairs — the exact primitive a real wallet
 * uses. The backend's /wallets/verify (services/chains/xrpl.ts) runs its real
 * cryptographic check and cannot tell this apart from a hardware wallet. The
 * only substituted boundary is the extension popup itself.
 *
 * Activated ONLY when the app is a dev build AND the test harness has injected
 * `window.__ACTIFY_E2E_WALLET__` (see getWalletAdapter). It is tree-shaken out
 * of production builds and never reachable there.
 */

export interface E2eWalletConfig {
  /** XRPL family seed (e.g. "sEd…"). The account is derived from it. */
  seed: string
}

declare global {
  interface Window {
    __ACTIFY_E2E_WALLET__?: E2eWalletConfig
  }
}

function readConfig(): E2eWalletConfig {
  const cfg = typeof window !== 'undefined' ? window.__ACTIFY_E2E_WALLET__ : undefined
  if (!cfg?.seed) {
    throw new WalletRejectedError()
  }
  return cfg
}

export function makeE2eAdapter(id: WalletId): WalletAdapter {
  const descriptor = walletDescriptors.find(w => w.id === id) ?? walletDescriptors[0]!

  function account() {
    const { publicKey, privateKey } = deriveKeypair(readConfig().seed)
    return { address: deriveAddress(publicKey), publicKey, privateKey }
  }

  return {
    id,
    label: descriptor.label,
    icon: descriptor.icon,
    installUrl: descriptor.installUrl,

    // Always ready: the harness injected a seed, so the button must enable.
    async isAvailable() {
      return typeof window !== 'undefined' && !!window.__ACTIFY_E2E_WALLET__?.seed
    },

    async connect() {
      const { address, publicKey } = account()
      return { address, publicKey }
    },

    // Signs hex(utf8(message)) exactly like the real adapters, so the backend
    // verifies it with ripple-keypairs against hex(utf8(challenge.message)).
    async signMessage(message: string) {
      const { privateKey } = account()
      return sign(utf8ToHex(message), privateKey)
    },

    // On-chain minting can't be faked: the backend re-derives the NFTokenID
    // from a validated XRPL tx, so there is nothing valid to return without a
    // real testnet submission. Kept explicit so no test silently relies on it.
    async mintNft(_params: MintNftParams): Promise<{ txHash: string }> {
      throw new Error('e2e wallet: mintNft is not supported (needs a real XRPL testnet submission)')
    },
  }
}
