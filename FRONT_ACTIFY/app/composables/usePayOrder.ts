import { getWalletAdapter, type WalletId } from '~/lib/wallets'
import type { OrderConfirmation, OrderCreated } from '~/types/asset'

// A submitted Payment moves real XRP: when the confirm that follows it fails,
// the retry must re-verify THAT transaction, never sign a second one. Persisted
// rather than kept in memory because the dangerous window is exactly the one a
// reload or a closed tab opens — the buyer would come back to a still-Pending
// order and be offered the pay button again. Orders expire in 30 min, so an
// abandoned entry is a dead 64-char string, not a leak worth reaping.
const STORAGE_PREFIX = 'actify:payment:'

// Confirm errors proving the recorded transaction will never settle this
// order — only then is signing a fresh payment the right retry. Ledger lookup
// failures (TX_NOT_FOUND, TX_NOT_VALIDATED, TX_LOOKUP_FAILED) are deliberately
// absent: they are transient, and re-paying on one would double-charge.
const DEFINITIVE_CONFIRM_ERRORS = new Set([
  'TX_FAILED',
  'TX_NOT_PAYMENT',
  'TX_WRONG_DESTINATION',
  'TX_WRONG_TAG',
  'TX_AMOUNT_TOO_LOW',
])

// Storage is client-only and can throw (private mode, quota, disabled): a
// failure here must never take down the pay flow, only its safety net.
function readSignedTxHash(orderId: string): string | null {
  if (!import.meta.client) return null
  try {
    return localStorage.getItem(STORAGE_PREFIX + orderId)
  } catch {
    return null
  }
}

function writeSignedTxHash(orderId: string, txHash: string | null) {
  if (!import.meta.client) return
  try {
    if (txHash) localStorage.setItem(STORAGE_PREFIX + orderId, txHash)
    else localStorage.removeItem(STORAGE_PREFIX + orderId)
  } catch {
    // Nothing to do: the flow still works, it just loses its resume point.
  }
}

/**
 * Settles a pending order from the buyer's wallet: open the wallet → sign the
 * XRP Payment carrying the order's DestinationTag → backend confirm, which
 * re-verifies the transaction on the ledger and unlocks the license.
 *
 * Replaces the manual "copy the address, paste the tx hash" round-trip; that
 * path stays available as a fallback for a payment this browser never recorded
 * (paid from a phone, storage disabled…).
 */
export function usePayOrder() {
  const orders = useOrders()
  const step = ref<string | null>(null)

  async function pay(order: OrderCreated, walletId: WalletId): Promise<OrderConfirmation> {
    try {
      let txHash = readSignedTxHash(order.id)

      if (!txHash) {
        const adapter = await getWalletAdapter(walletId)

        step.value = `Ouverture de ${adapter.label}…`
        const { address } = await adapter.connect()

        step.value = `Validez le paiement dans ${adapter.label}…`
        const paid = await adapter.sendPayment({
          account: address,
          destination: order.paymentAddress,
          destinationTag: order.paymentTag,
          amountDrops: xrpToDrops(order.amount),
        })
        txHash = paid.txHash
        writeSignedTxHash(order.id, txHash)
      }

      step.value = 'Vérification on-chain…'
      const confirmation = await orders.confirm(order.id, txHash)
      writeSignedTxHash(order.id, null)
      return confirmation
    } catch (err) {
      const code = toApiError(err)?.code
      if (code && DEFINITIVE_CONFIRM_ERRORS.has(code)) {
        writeSignedTxHash(order.id, null)
      }
      throw err
    } finally {
      step.value = null
    }
  }

  /** True once the wallet has signed for this order — a retry re-confirms, it does not re-pay. */
  const hasSignedPayment = (orderId: string) => readSignedTxHash(orderId) !== null

  /** Drops the resume point once the order is settled by any other route. */
  const forgetSignedPayment = (orderId: string) => writeSignedTxHash(orderId, null)

  return { step, pay, hasSignedPayment, forgetSignedPayment }
}
