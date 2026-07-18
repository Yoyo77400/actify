// Shapes returned by the public users API (see API_ACTIFY_NODE/services/users.service.ts):
// GET /users/:username (serializePublic + stats) and GET /users/:username/assets.

export interface PublicProfileStats {
  listingsCount: number
  reviewsCount: number
}

export interface PublicProfile {
  id: string
  username: string | null
  displayName: string | null
  bio: string | null
  avatarCid: string | null
  role: string
  isVerified: boolean
  createdAt: string
  stats: PublicProfileStats
}

// Item of GET /users/:username/assets: whitelisted public columns only
// (always Published, not soft-deleted — the API keeps fileIpfsCid and other
// internals out of the payload). Decimal columns (price) serialize to strings
// over JSON.
export interface PublicListing {
  id: string
  slug: string | null
  title: string
  shortDescription: string | null
  description: string | null
  thumbnailCid: string | null
  isFree: boolean
  price: string | null
  currency: string | null
  viewsCount: number
  salesCount: number
  createdAt: string
}

// ─── Legacy mock-era display types ───
// Not API shapes. Kept ONLY because unused components outside this refactor's
// scope still import them (components/home/*, components/asset/AssetInfoPanel,
// components/asset/AssetPreview). Delete together with those dead components.

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
