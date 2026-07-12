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
  switch (id) {
    case 'gemwallet':
      return (await import('./gemwallet')).gemwalletAdapter
    case 'crossmark':
      return (await import('./crossmark')).crossmarkAdapter
  }
}

export { WalletRejectedError } from './types'
export type { WalletAdapter, WalletConnection, WalletId } from './types'
