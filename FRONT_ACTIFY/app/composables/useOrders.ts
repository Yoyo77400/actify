import type { OrderConfirmation, OrderCreated } from '~/types/asset'

export function useOrders() {
  const api = useApi()

  return {
    create: (assetId: string) => api.post<OrderCreated>('/orders', { assetId }),
    getPendingForAsset: (assetId: string) =>
      api.get<OrderCreated | null>(`/orders/pending/${assetId}`),
    confirm: (orderId: string, txHash: string) =>
      api.post<OrderConfirmation>(`/orders/${orderId}/confirm`, { txHash }),
  }
}
