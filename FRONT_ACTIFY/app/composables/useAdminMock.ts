import type {
  AdminUser,
  AdminSale,
  AdminAsset,
  AdminReport,
  AdminDashboardPayload,
  AdminUsersPayload,
  AdminSalesPayload,
  AdminAssetsPayload,
  AdminReportsPayload
} from '~/types/admin'

const users: AdminUser[] = [
  {
    id: 'usr-001',
    displayName: '#ETHAN22',
    username: '@ethan22',
    email: 'ethan22@proton.me',
    avatar: 'https://picsum.photos/seed/ethan22avatar/200/200',
    role: 'artist',
    status: 'active',
    wallet: '0x183H...928f',
    joinedAt: '2025-01-12',
    salesCount: 47,
    totalVolume: '12.4 ETH',
    lastActiveAt: '2 hours ago'
  },
  {
    id: 'usr-002',
    displayName: 'Boto',
    username: '@boto',
    email: 'boto@gmail.com',
    avatar: 'https://picsum.photos/seed/boto/200/200',
    role: 'artist',
    status: 'active',
    wallet: '0x92aF...c31e',
    joinedAt: '2024-11-03',
    salesCount: 132,
    totalVolume: '89.2 ETH',
    lastActiveAt: '15 min ago'
  },
  {
    id: 'usr-003',
    displayName: 'ShadowMint',
    username: '@shadowmint',
    email: 'shadow@yandex.ru',
    avatar: 'https://picsum.photos/seed/shadow/200/200',
    role: 'user',
    status: 'suspended',
    wallet: '0x44bE...d90a',
    joinedAt: '2025-03-22',
    salesCount: 3,
    totalVolume: '0.18 ETH',
    lastActiveAt: '3 days ago'
  },
  {
    id: 'usr-004',
    displayName: 'CryptoLena',
    username: '@cryptolena',
    email: 'lena@outlook.com',
    avatar: 'https://picsum.photos/seed/lena/200/200',
    role: 'user',
    status: 'active',
    wallet: '0xf1C3...a87b',
    joinedAt: '2025-02-08',
    salesCount: 19,
    totalVolume: '3.6 ETH',
    lastActiveAt: '1 day ago'
  },
  {
    id: 'usr-005',
    displayName: 'NullAddr',
    username: '@nulladdr',
    email: 'nulladdr@temp.io',
    avatar: 'https://picsum.photos/seed/nulladdr/200/200',
    role: 'user',
    status: 'banned',
    wallet: '0x0000...dead',
    joinedAt: '2025-04-01',
    salesCount: 0,
    totalVolume: '0 ETH',
    lastActiveAt: '2 weeks ago'
  },
  {
    id: 'usr-006',
    displayName: 'AdminMax',
    username: '@adminmax',
    email: 'max@actify.io',
    avatar: 'https://picsum.photos/seed/adminmax/200/200',
    role: 'admin',
    status: 'active',
    wallet: '0xAD01...ff02',
    joinedAt: '2024-09-15',
    salesCount: 0,
    totalVolume: '0 ETH',
    lastActiveAt: 'Online'
  },
  {
    id: 'usr-007',
    displayName: 'PixelVault',
    username: '@pixelvault',
    email: 'vault@proton.me',
    avatar: 'https://picsum.photos/seed/pixelvault/200/200',
    role: 'artist',
    status: 'active',
    wallet: '0x8e2D...4a1c',
    joinedAt: '2025-01-28',
    salesCount: 64,
    totalVolume: '22.7 ETH',
    lastActiveAt: '5 hours ago'
  }
]

const sales: AdminSale[] = [
  {
    id: 'sale-001',
    assetName: 'Mountain of Hell #12',
    assetImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=120&q=80',
    seller: '@ethan22',
    buyer: '@cryptolena',
    price: '0.45',
    currency: 'ETH',
    chain: 'Ethereum',
    status: 'completed',
    createdAt: '2025-06-10T14:23:00Z',
    txHash: '0x7a3f...e912'
  },
  {
    id: 'sale-002',
    assetName: 'Neon Drift #03',
    assetImage: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=120&q=80',
    seller: '@boto',
    buyer: '@ethan22',
    price: '0.25',
    currency: 'ETH',
    chain: 'Ethereum',
    status: 'completed',
    createdAt: '2025-06-09T09:11:00Z',
    txHash: '0x1b8c...f430'
  },
  {
    id: 'sale-003',
    assetName: 'Synthetic Echoes #19',
    assetImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=120&q=80',
    seller: '@shadowmint',
    buyer: '@pixelvault',
    price: '1.20',
    currency: 'ETH',
    chain: 'Ethereum',
    status: 'disputed',
    createdAt: '2025-06-08T18:45:00Z',
    txHash: '0x9d4e...a873'
  },
  {
    id: 'sale-004',
    assetName: 'Digital Flora #07',
    assetImage: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=120&q=80',
    seller: '@cryptolena',
    buyer: '@boto',
    price: '0.04',
    currency: 'ETH',
    chain: 'Ethereum',
    status: 'pending',
    createdAt: '2025-06-10T16:02:00Z',
    txHash: '0x00...pending'
  },
  {
    id: 'sale-005',
    assetName: 'Mountain of Hell #02',
    assetImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=120&q=80',
    seller: '@ethan22',
    buyer: '@nulladdr',
    price: '0.38',
    currency: 'ETH',
    chain: 'Ethereum',
    status: 'cancelled',
    createdAt: '2025-06-05T11:30:00Z',
    txHash: '0xdead...0000'
  },
  {
    id: 'sale-006',
    assetName: 'Neon Drift #11',
    assetImage: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=120&q=80',
    seller: '@pixelvault',
    buyer: '@cryptolena',
    price: '0.31',
    currency: 'ETH',
    chain: 'Ethereum',
    status: 'refunded',
    createdAt: '2025-06-07T20:15:00Z',
    txHash: '0xab12...cd34'
  }
]

const assets: AdminAsset[] = [
  {
    id: 'asset-001',
    name: 'Mountain of Hell #12',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=120&q=80',
    creator: '@ethan22',
    collection: 'Mountain of Hell 25/26',
    price: '0.45',
    currency: 'ETH',
    chain: 'Ethereum',
    status: 'listed',
    mintedAt: '2025-05-14',
    salesCount: 3,
    reportCount: 0
  },
  {
    id: 'asset-002',
    name: 'Synthetic Echoes #19',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=120&q=80',
    creator: '@boto',
    collection: 'Synthetic Echoes',
    price: '1.20',
    currency: 'ETH',
    chain: 'Ethereum',
    status: 'flagged',
    mintedAt: '2025-04-20',
    salesCount: 7,
    reportCount: 3
  },
  {
    id: 'asset-003',
    name: 'CopyPaste Ape #999',
    image: 'https://picsum.photos/seed/fakeape/120/120',
    creator: '@nulladdr',
    collection: 'Fake Collection',
    price: '99.00',
    currency: 'ETH',
    chain: 'Ethereum',
    status: 'removed',
    mintedAt: '2025-04-02',
    salesCount: 0,
    reportCount: 12
  },
  {
    id: 'asset-004',
    name: 'Neon Drift #03',
    image: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=120&q=80',
    creator: '@pixelvault',
    collection: 'Neon Drift',
    price: '0.25',
    currency: 'ETH',
    chain: 'Ethereum',
    status: 'listed',
    mintedAt: '2025-05-30',
    salesCount: 1,
    reportCount: 0
  },
  {
    id: 'asset-005',
    name: 'Digital Flora #07',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=120&q=80',
    creator: '@cryptolena',
    collection: 'Digital Flora',
    price: '0.04',
    currency: 'ETH',
    chain: 'Ethereum',
    status: 'unlisted',
    mintedAt: '2025-06-01',
    salesCount: 2,
    reportCount: 0
  }
]

const reports: AdminReport[] = [
  {
    id: 'rpt-001',
    reason: 'scam',
    description: 'This user sold a fake NFT pretending it was from the official Mountain of Hell collection.',
    targetType: 'user',
    targetId: 'usr-005',
    targetName: 'NullAddr',
    reportedBy: '@cryptolena',
    status: 'open',
    createdAt: '2025-06-10T10:00:00Z'
  },
  {
    id: 'rpt-002',
    reason: 'copyright',
    description: 'Asset is a direct copy of an existing artwork without permission.',
    targetType: 'asset',
    targetId: 'asset-003',
    targetName: 'CopyPaste Ape #999',
    reportedBy: '@boto',
    status: 'reviewing',
    createdAt: '2025-06-09T14:30:00Z'
  },
  {
    id: 'rpt-003',
    reason: 'fake',
    description: 'Suspicious transaction with inflated price, possible wash trading.',
    targetType: 'sale',
    targetId: 'sale-003',
    targetName: 'Synthetic Echoes #19',
    reportedBy: '@ethan22',
    status: 'open',
    createdAt: '2025-06-08T22:10:00Z'
  },
  {
    id: 'rpt-004',
    reason: 'inappropriate',
    description: 'Profile picture contains inappropriate content.',
    targetType: 'user',
    targetId: 'usr-003',
    targetName: 'ShadowMint',
    reportedBy: '@pixelvault',
    status: 'resolved',
    createdAt: '2025-06-06T08:45:00Z'
  }
]

export const dashboardMock: AdminDashboardPayload = {
  stats: {
    totalUsers: 1_847,
    activeUsers: 423,
    totalSales: 3_291,
    totalVolume: '1,204.8 ETH',
    pendingReports: 2,
    flaggedAssets: 3,
    userGrowth: 12.4,
    salesGrowth: -3.1,
    volumeGrowth: 8.7
  },
  recentSales: sales.slice(0, 4),
  recentReports: reports.filter(r => r.status === 'open' || r.status === 'reviewing')
}

export const usersMock: AdminUsersPayload = { users, total: users.length }
export const salesMock: AdminSalesPayload = { sales, total: sales.length }
export const assetsMock: AdminAssetsPayload = { assets, total: assets.length }
export const reportsMock: AdminReportsPayload = { reports, total: reports.length }