// Shapes returned by the admin API (see API_ACTIFY_NODE/services/admin.service.ts
// serializers — the source of truth). All admin endpoints require Bearer + admin role.

/** Statuses accepted by PUT /admin/assets/:id/status. */
export const ADMIN_ASSET_STATUSES = ['Draft', 'Published', 'Archived', 'Suspended'] as const
export type AdminAssetStatus = (typeof ADMIN_ASSET_STATUSES)[number]

/** Purchase lifecycle statuses (see orders.service ORDER_* constants). */
export const ADMIN_ORDER_STATUSES = ['Pending', 'Confirmed', 'Cancelled'] as const
export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number]

/** Pagination envelope meta echoed by every admin list endpoint. */
export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AdminUserRef {
  id: string
  username: string | null
  displayName: string | null
}

/** Item of GET /admin/assets (soft-deleted rows included). */
export interface AdminAsset {
  id: string
  slug: string | null
  title: string
  isFree: boolean
  // Prisma Decimal serializes to a string over JSON.
  price: string | null
  currency: string | null
  status: AdminAssetStatus
  viewsCount: number
  salesCount: number
  createdAt: string
  deletedAt: string | null
  seller: AdminUserRef
}

/** Item of GET /admin/users. */
export interface AdminUser {
  id: string
  username: string | null
  displayName: string | null
  email: string | null
  avatarCid: string | null
  role: string
  isVerified: boolean
  isBanned: boolean
  createdAt: string
  deletedAt: string | null
}

/** GET /admin/users/:id — list shape plus bio, wallets and counters. */
export interface AdminUserDetail extends AdminUser {
  bio: string | null
  wallets: Array<{
    id: string
    address: string
    chain: string
    label: string | null
    isPrimary: boolean
    createdAt: string
  }>
  stats: { listingsCount: number; purchasesCount: number }
}

/** Item of GET /admin/orders. txHash is null while the payment is pending. */
export interface AdminOrder {
  id: string
  buyer: AdminUserRef
  listing: { id: string; title: string; slug: string | null }
  txHash: string | null
  amountPaid: number
  status: AdminOrderStatus
  purchasedAt: string
}

/** GET /admin/stats. byStatus keys: Draft / Published / Archived / Suspended. */
export interface AdminStats {
  totalUsers: number
  bannedUsers: number
  totalAssets: number
  byStatus: Record<string, number>
  totalOrders: number
  confirmedRevenue: number
}
