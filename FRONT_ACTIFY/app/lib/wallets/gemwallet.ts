import { getPublicKey, isInstalled, signMessage } from '@gemwallet/api'
import { WalletRejectedError, type WalletAdapter } from './types'

export const gemwalletAdapter: WalletAdapter = {
  id: 'gemwallet',
  label: 'GemWallet',
  icon: 'ph:diamond',
  installUrl: 'https://gemwallet.app/',

  async isAvailable() {
    try {
      const res = await isInstalled()
      return res.result.isInstalled
    } catch {
      return false
    }
  },

  async connect() {
    const res = await getPublicKey()
    if (res.type !== 'response' || !res.result) {
      throw new WalletRejectedError()
    }
    return { address: res.result.address, publicKey: res.result.publicKey }
  },

  async signMessage(message: string) {
    const res = await signMessage(message)
    if (res.type !== 'response' || !res.result) {
      throw new WalletRejectedError()
    }
    return res.result.signedMessage
  },
}
