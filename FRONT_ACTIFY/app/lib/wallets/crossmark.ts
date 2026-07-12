import sdk from '@crossmarkio/sdk'
import { WalletRejectedError, utf8ToHex, type MintNftParams, type WalletAdapter } from './types'

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

  async mintNft(params: MintNftParams) {
    // The backend re-derives the NFTokenID from the on-chain tx, so only the
    // hash matters here; its nesting under resp varies across Crossmark docs.
    const { response } = await sdk.async.signAndSubmitAndWait({
      TransactionType: 'NFTokenMint',
      Account: params.account,
      NFTokenTaxon: params.nftokenTaxon,
      URI: params.uriHex,
      Flags: params.flags,
      TransferFee: params.transferFee,
    })
    const resp = (response?.data as { resp?: { result?: { hash?: string }, hash?: string } } | undefined)?.resp
    const txHash = resp?.result?.hash ?? resp?.hash
    if (!txHash) {
      throw new WalletRejectedError()
    }
    return { txHash }
  },
}
