import { AppError } from '../../utils/http'

const DEFAULT_XRPL_RPC_URL = 'https://s.altnet.rippletest.net:51234/'
const DROPS_PER_XRP = 1_000_000
const TXN_NOT_FOUND_ERROR = 'txnNotFound'
const PAYMENT_TX_TYPE = 'Payment'
const TX_SUCCESS_RESULT = 'tesSUCCESS'

export interface XrplPaymentInput {
  txHash: string
  destination: string
  minAmountXrp: number
}

interface XrplTxResult {
  error?: string
  validated?: boolean
  TransactionType?: string
  Destination?: string
  DeliveredAmount?: unknown
  meta?: { TransactionResult?: string; delivered_amount?: unknown }
}

/**
 * Verifies on the XRP Ledger (JSON-RPC `tx` call) that `txHash` is a
 * validated, successful Payment delivering at least `minAmountXrp` XRP to
 * `destination`. Resolves on success, throws an AppError describing the
 * first failed check otherwise.
 */
export async function verifyXrplPayment(input: XrplPaymentInput): Promise<void> {
  const rpcUrl = process.env.XRPL_RPC_URL ?? DEFAULT_XRPL_RPC_URL

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ method: 'tx', params: [{ transaction: input.txHash }] }),
  })
  if (!response.ok) {
    throw new AppError(502, 'TX_LOOKUP_FAILED', 'Vérification de la transaction XRPL impossible')
  }

  const { result } = (await response.json()) as { result?: XrplTxResult }
  if (!result || result.error) {
    if (result?.error === TXN_NOT_FOUND_ERROR) {
      throw new AppError(404, 'TX_NOT_FOUND', 'Transaction introuvable sur le ledger XRPL')
    }
    throw new AppError(502, 'TX_LOOKUP_FAILED', 'Vérification de la transaction XRPL impossible')
  }

  if (result.validated !== true) {
    throw new AppError(400, 'TX_NOT_VALIDATED', 'Transaction non encore validée par le ledger XRPL')
  }
  if (result.TransactionType !== PAYMENT_TX_TYPE) {
    throw new AppError(400, 'TX_NOT_PAYMENT', "La transaction n'est pas un paiement XRPL")
  }
  if (result.Destination !== input.destination) {
    throw new AppError(400, 'TX_WRONG_DESTINATION', "La transaction ne paie pas l'adresse du vendeur")
  }
  if (result.meta?.TransactionResult !== TX_SUCCESS_RESULT) {
    throw new AppError(400, 'TX_FAILED', 'La transaction a échoué sur le ledger XRPL')
  }

  // delivered_amount is a string of drops for native XRP payments; issued
  // currency (IOU) payments carry an object here and are rejected because
  // they don't deliver the required XRP amount.
  const delivered = result.meta.delivered_amount ?? result.DeliveredAmount
  // Delivered drops can exceed Number.MAX_SAFE_INTEGER (XRP supply is 1e17
  // drops), hence BigInt for the comparison. Prices are XRP with at most 6
  // decimals, so minAmountXrp * DROPS_PER_XRP is an exact integer once
  // float noise is removed by Math.round.
  const minDrops = BigInt(Math.round(input.minAmountXrp * DROPS_PER_XRP))
  if (typeof delivered !== 'string' || !/^\d+$/.test(delivered) || BigInt(delivered) < minDrops) {
    throw new AppError(400, 'TX_AMOUNT_TOO_LOW', 'Montant livré insuffisant pour cette commande')
  }
}
