import { getPublicKey, isInstalled, mintNFT, sendPayment, signMessage } from '@gemwallet/api'
import {
  flagsToGemwallet,
  WalletRejectedError,
  type MintNftParams,
  type SendPaymentParams,
  type WalletAdapter,
} from './types'

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

  async mintNft(params: MintNftParams) {
    const res = await mintNFT({
      NFTokenTaxon: params.nftokenTaxon,
      URI: params.uriHex,
      flags: flagsToGemwallet(params.flags),
      transferFee: params.transferFee,
    })
    if (res.type !== 'response' || !res.result?.hash) {
      throw new WalletRejectedError()
    }
    return { txHash: res.result.hash }
  },

  async sendPayment(params: SendPaymentParams) {
    // GemWallet pays from the account currently selected in the extension, so
    // params.account is informational here — the popup shows the payer.
    // A bare string amount is drops (an object would be an issued currency).
    const res = await sendPayment({
      amount: params.amountDrops,
      destination: params.destination,
      destinationTag: params.destinationTag,
    })
    if (res.type !== 'response' || !res.result?.hash) {
      throw new WalletRejectedError('Paiement refusé dans GemWallet')
    }
    return { txHash: res.result.hash }
  },
}
