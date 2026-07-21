import type { WalletAdapter, WalletId } from './types'

export interface WalletDescriptor {
  id: WalletId
  label: string
  icon: string
  installUrl?: string
}

// Static metadata only — safe to import during SSR. The SDKs themselves touch
// `window` at import time, so adapters load lazily via getWalletAdapter().
export const walletDescriptors: WalletDescriptor[] = [
  { id: 'gemwallet', label: 'GemWallet', icon: 'ph:diamond', installUrl: 'https://gemwallet.app/' },
  { id: 'crossmark', label: 'Crossmark', icon: 'ph:x-square', installUrl: 'https://crossmark.io/' },
]

export async function getWalletAdapter(id: WalletId): Promise<WalletAdapter> {
  // E2E seam: when running a dev build under Playwright (which injects
  // window.__ACTIFY_E2E_WALLET__), swap the real extension adapters for an
  // in-page signer that produces genuine XRPL signatures. Guarded by
  // import.meta.dev so it is tree-shaken out of production builds.
  if (import.meta.dev && typeof window !== 'undefined' && window.__ACTIFY_E2E_WALLET__?.seed) {
    return (await import('./e2e')).makeE2eAdapter(id)
  }

  switch (id) {
    case 'gemwallet':
      return (await import('./gemwallet')).gemwalletAdapter
    case 'crossmark':
      return (await import('./crossmark')).crossmarkAdapter
  }
}

export { WalletRejectedError } from './types'
export type { WalletAdapter, WalletConnection, WalletId } from './types'
