// Shapes returned by the API assets/categories/orders endpoints
// (see API_ACTIFY_NODE/services/assets.service.ts serializeListing).

export interface AssetSeller {
  id: string
  username: string | null
  displayName: string | null
}

export interface AssetCategory {
  id: number
  name: string
  slug: string
}

export interface AssetNft {
  nftokenId: string
  issuer: string
  mintTxHash: string
}

export interface AssetCard {
  id: string
  slug: string | null
  title: string
  shortDescription: string | null
  description: string | null
  thumbnailCid: string | null
  isFree: boolean
  price: string | null
  currency: string | null
  distributionMode: string
  maxDownloads: number | null
  royaltyBps: number | null
  status: string
  viewsCount: number
  salesCount: number
  hasFile: boolean
  tokenized: boolean
  nft: AssetNft | null
  createdAt: string
  seller: AssetSeller
  categories: AssetCategory[]
  tags: string[]
}

export interface AssetDetail extends AssetCard {
  averageRating: number | null
  reviewsCount: number
}

export interface CategoryWithCount {
  id: number
  name: string
  slug: string
  listingCount: number
}

export interface CreateAssetBody {
  title: string
  description?: string | null
  shortDescription?: string | null
  tags?: string[]
  categoryIds?: number[]
  distributionMode?: 'unlimited' | 'limited' | 'unique'
  maxDownloads?: number | null
  isFree?: boolean
  basePrice?: number | null
  currency?: string
  royaltyBps?: number | null
  fileIpfsCid?: string | null
  thumbnailCid?: string | null
}

export interface MintIntent {
  nftokenTaxon: number
  uri: string
  uriHex: string
  flags: number
  transferFee: number
  minters: string[]
}

export interface OrderCreated {
  id: string
  status: string
  amount: string | number
  currency: string | null
  paymentAddress: string
  paymentTag: number
  expiresAt: string
}
