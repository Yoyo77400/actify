export type UserRole = 'user' | 'artist' | 'moderator' | 'admin'
export type UserStatus = 'active' | 'suspended' | 'banned'
export type SaleStatus = 'completed' | 'pending' | 'disputed' | 'cancelled' | 'refunded'
export type AssetStatus = 'listed' | 'unlisted' | 'flagged' | 'removed'
export type ReportReason = 'scam' | 'copyright' | 'inappropriate' | 'fake' | 'other'
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed'

export interface AdminUser {
  id: string
  displayName: string
  username: string
  email: string
  avatar: string
  role: UserRole
  status: UserStatus
  wallet: string
  joinedAt: string
  salesCount: number
  totalVolume: string
  lastActiveAt: string
}

export interface AdminSale {
  id: string
  assetName: string
  assetImage: string
  seller: string
  buyer: string
  price: string
  currency: string
  chain: string
  status: SaleStatus
  createdAt: string
  txHash: string
}

export interface AdminAsset {
  id: string
  name: string
  image: string
  creator: string
  collection: string
  price: string
  currency: string
  chain: string
  status: AssetStatus
  mintedAt: string
  salesCount: number
  reportCount: number
}

export interface AdminReport {
  id: string
  reason: ReportReason
  description: string
  targetType: 'user' | 'asset' | 'sale'
  targetId: string
  targetName: string
  reportedBy: string
  status: ReportStatus
  createdAt: string
}

export interface AdminDashboardStats {
  totalUsers: number
  activeUsers: number
  totalSales: number
  totalVolume: string
  pendingReports: number
  flaggedAssets: number
  userGrowth: number
  salesGrowth: number
  volumeGrowth: number
}

export interface AdminDashboardPayload {
  stats: AdminDashboardStats
  recentSales: AdminSale[]
  recentReports: AdminReport[]
}

export interface AdminUsersPayload {
  users: AdminUser[]
  total: number
}

export interface AdminSalesPayload {
  sales: AdminSale[]
  total: number
}

export interface AdminAssetsPayload {
  assets: AdminAsset[]
  total: number
}

export interface AdminReportsPayload {
  reports: AdminReport[]
  total: number
}