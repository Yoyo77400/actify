import { deriveAddress, deriveKeypair, generateSeed, sign } from 'ripple-keypairs'
import { utf8ToHex, type WalletAdapter } from './types'

const SEED_STORAGE_KEY = 'actify_dev_wallet_seed'

// In-browser wallet for development ONLY: generates an XRPL keypair, persists
// the seed in localStorage and signs challenges without any extension. Never
// registered outside `import.meta.dev` (see index.ts) and never holds funds.
function getKeypair() {
  let seed = localStorage.getItem(SEED_STORAGE_KEY)
  if (!seed) {
    seed = generateSeed()
    localStorage.setItem(SEED_STORAGE_KEY, seed)
  }
  return deriveKeypair(seed)
}

export const devWalletAdapter: WalletAdapter = {
  id: 'devwallet',
  label: 'Dev Wallet (local)',
  icon: 'ph:flask',

  async isAvailable() {
    return true
  },

  async connect() {
    const pair = getKeypair()
    return { address: deriveAddress(pair.publicKey), publicKey: pair.publicKey }
  },

  async signMessage(message: string) {
    const pair = getKeypair()
    return sign(utf8ToHex(message), pair.privateKey)
  },
}
