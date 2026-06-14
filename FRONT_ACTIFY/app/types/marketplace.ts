export interface User {
  id: string
  email: string
  displayName: string
  username: string
  role: 'visitor' | 'user' | 'creator' | 'admin'
  avatar: string
  bio: string
  wallet: string | null
  totpEnabled: boolean
  createdAt: string
}

export interface CategoryChip {
  id: string
  label: string
}

export interface HeroStat {
  label: string
  value: string
}

export interface HeroSlide {
  id: string
  title: string
  creator: string
  verified?: boolean
  image: string
  stats: HeroStat[]
}

export interface MarketToken {
  id: string
  name: string
  symbol: string
  image: string
  priceLabel: string
  change: number
  verified?: boolean
}

export interface CollectionCard {
  id: string
  name: string
  floorPrice: string
  change: number
  image: string
  verified?: boolean
}

export interface DropCard {
  id: string
  name: string
  subtitle: string
  image: string
  badge?: string
}

export interface SellerRow {
  id: string
  name: string
  image: string
  floorPrice: string
  currency: string
  change: number
  verified?: boolean
}

export interface EducationCard {
  id: string
  title: string
  image: string
}

export interface WeeklySaleItem {
  id: string
  name: string
  price: string
  image: string
}

export interface WeeklyShowcase {
  title: string
  subtitle: string
  background: string
  items: WeeklySaleItem[]
}

export interface HomePayload {
  categories: CategoryChip[]
  chains: CategoryChip[]
  hero: HeroSlide[]
  trendingTokens: MarketToken[]
  featuredCollections: CollectionCard[]
  trendingCollections: MarketToken[]
  featuredDrops: DropCard[]
  topMovers: CollectionCard[]
  featuredTokens: CollectionCard[]
  nft101: EducationCard[]
  topSellers: SellerRow[]
  weeklyShowcase: WeeklyShowcase
}

export interface ArtistIdentity {
  slug: string
  displayName: string
  username: string
  avatar: string
  cover: string
  joinedAt: string
  wallet: string
  bio: string
  followersLabel: string
}

export interface ArtistCollection {
  id: string
  name: string
  image: string
  description: string
  buttonLabel: string
}

export interface ArtistAsset {
  id: string
  name: string
  image: string
  cover?: string
  price: string
  currency: string
  statusLabel: string
  active: boolean
  description: string
  creator: string
  contract: string
  chain: string
  popularity: number
  salesCount: number
  lastSaleLabel: string
}

export interface ArtistPayload {
  artist: ArtistIdentity
  collections: ArtistCollection[]
  items: ArtistAsset[]
}

export interface AssetDetailPayload {
  asset: ArtistAsset
  collectionName: string
  creatorVerified?: boolean
  tabs: Array<{ id: 'description' | 'orders' | 'activity'; label: string }>
}
