import { AppError } from '../../utils/http'
import { fetchValidatedTx } from './xrpl-rpc'

const DROPS_PER_XRP = 1_000_000
const PAYMENT_TX_TYPE = 'Payment'
const TX_SUCCESS_RESULT = 'tesSUCCESS'

export interface XrplPaymentInput {
  txHash: string
  destination: string
  destinationTag: number
  minAmountXrp: number
}

/**
 * Verifies on the XRP Ledger that `txHash` is a validated, successful Payment
 * delivering at least `minAmountXrp` XRP to `destination`, carrying the
 * per-order `destinationTag`. The tag is what binds a payment to one specific
 * order: without it, any payment to the seller could be replayed to confirm
 * an order. Waits for ledger validation via fetchValidatedTx — buyers paste
 * the hash right after their wallet submits. Resolves on success, throws an
 * AppError describing the first failed check otherwise.
 */
export async function verifyXrplPayment(input: XrplPaymentInput): Promise<void> {
  const result = await fetchValidatedTx(input.txHash)

  if (result.TransactionType !== PAYMENT_TX_TYPE) {
    throw new AppError(400, 'TX_NOT_PAYMENT', "La transaction n'est pas un paiement XRPL")
  }
  if (result.Destination !== input.destination) {
    throw new AppError(400, 'TX_WRONG_DESTINATION', "La transaction ne paie pas l'adresse du vendeur")
  }
  if (result.DestinationTag !== input.destinationTag) {
    throw new AppError(400, 'TX_WRONG_TAG', 'La transaction ne correspond pas à cette commande')
  }
  if (result.meta?.TransactionResult !== TX_SUCCESS_RESULT) {
    throw new AppError(400, 'TX_FAILED', 'La transaction a échoué sur le ledger XRPL')
  }

  // delivered_amount is a string of drops for native XRP payments; issued
  // currency (IOU) payments carry an object here and are rejected because
  // they don't deliver the required XRP amount. (The legacy metadata field is
  // meta.DeliveredAmount; delivered_amount is the modern rippled field.)
  const delivered = result.meta.delivered_amount ?? result.meta.DeliveredAmount
  // Delivered drops can exceed Number.MAX_SAFE_INTEGER (XRP supply is 1e17
  // drops), hence BigInt for the comparison. Prices are XRP with at most 6
  // decimals, so minAmountXrp * DROPS_PER_XRP is an exact integer once
  // float noise is removed by Math.round.
  const minDrops = BigInt(Math.round(input.minAmountXrp * DROPS_PER_XRP))
  if (typeof delivered !== 'string' || !/^\d+$/.test(delivered) || BigInt(delivered) < minDrops) {
    throw new AppError(400, 'TX_AMOUNT_TOO_LOW', 'Montant livré insuffisant pour cette commande')
  }
}
