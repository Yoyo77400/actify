import type { OrderConfirmation, OrderCreated } from '~/types/asset'

// Confirm waits server-side for XRPL consensus (a few ledgers, ~4s each);
// give it more room than the default 15s API timeout.
const CONFIRM_TIMEOUT_MS = 30_000

export function useOrders() {
  const api = useApi()

  return {
    create: (assetId: string) => api.post<OrderCreated>('/orders', { assetId }),
    getPendingForAsset: (assetId: string) =>
      api.get<OrderCreated | null>(`/orders/pending/${assetId}`),
    confirm: (orderId: string, txHash: string) =>
      api.post<OrderConfirmation>(`/orders/${orderId}/confirm`, { txHash }, { timeoutMs: CONFIRM_TIMEOUT_MS }),
  }
}
