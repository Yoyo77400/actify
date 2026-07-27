import sdk from '@crossmarkio/sdk'
import {
  WalletRejectedError,
  utf8ToHex,
  type MintNftParams,
  type SendPaymentParams,
  type WalletAdapter,
} from './types'

// signAndSubmitAndWait nests the ledger response differently across Crossmark
// versions; both shapes carry the hash we need.
function extractTxHash(data: unknown): string | undefined {
  const resp = (data as { resp?: { result?: { hash?: string }; hash?: string } } | undefined)?.resp
  return resp?.result?.hash ?? resp?.hash
}

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
    // hash matters here.
    const { response } = await sdk.async.signAndSubmitAndWait({
      TransactionType: 'NFTokenMint',
      Account: params.account,
      NFTokenTaxon: params.nftokenTaxon,
      URI: params.uriHex,
      Flags: params.flags,
      TransferFee: params.transferFee,
    })
    const txHash = extractTxHash(response?.data)
    if (!txHash) {
      throw new WalletRejectedError()
    }
    return { txHash }
  },

  async sendPayment(params: SendPaymentParams) {
    const { response } = await sdk.async.signAndSubmitAndWait({
      TransactionType: 'Payment',
      Account: params.account,
      Destination: params.destination,
      DestinationTag: params.destinationTag,
      Amount: params.amountDrops,
    })
    const txHash = extractTxHash(response?.data)
    if (!txHash) {
      throw new WalletRejectedError('Paiement refusé dans Crossmark')
    }
    return { txHash }
  },
}
