import sdk from '@crossmarkio/sdk'
import { WalletRejectedError, utf8ToHex, type WalletAdapter } from './types'

export const crossmarkAdapter: WalletAdapter = {
  id: 'crossmark',
  label: 'Crossmark',
  icon: 'ph:x-square',
  installUrl: 'https://crossmark.io/',

  async isAvailable() {
    try {
      return sdk.sync.isInstalled() ?? false
    } catch {
      return false
    }
  },

  // Crossmark signs during sign-in: connect() only identifies the account,
  // signMessage() runs a second signInAndWait carrying the challenge hex.
  async connect() {
    const { response } = await sdk.async.signInAndWait()
    const data = response?.data
    if (!data?.address || !data.publicKey) {
      throw new WalletRejectedError()
    }
    return { address: data.address, publicKey: data.publicKey }
  },

  async signMessage(message: string) {
    const { response } = await sdk.async.signInAndWait(utf8ToHex(message))
    const signature = response?.data?.signature
    if (!signature) {
      throw new WalletRejectedError()
    }
    return signature
  },
}
