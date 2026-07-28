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
  collectionId: number | null
  status: string
  /** true quand la capacité est atteinte : pièce unique vendue, ou quota `limited` épuisé. */
  soldOut: boolean
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

/** Why the current viewer may download this asset — null when they may not. */
export type EntitlementReason = 'free' | 'purchase' | 'nft_owner'

export interface ViewerEntitlement {
  canDownload: boolean
  reason: EntitlementReason | null
}

export interface AssetDetail extends AssetCard {
  averageRating: number | null
  reviewsCount: number
  viewerEntitlement: ViewerEntitlement
  isFavorited: boolean
}

export interface DownloadTicket {
  downloadToken: string
  expiresAt: string
}

export interface CategoryWithCount {
  id: number
  name: string
  slug: string
  listingCount: number
}

/** Body of PUT /assets/:id - off-chain listing fields only. */
export interface UpdateAssetBody {
  title?: string
  shortDescription?: string | null
  description?: string | null
  tags?: string[]
  distributionMode?: string
  maxDownloads?: number | null
  isFree?: boolean
  basePrice?: number | null
  currency?: string | null
  royaltyBps?: number | null
  /** null détache l'asset de sa collection ; undefined le laisse inchangé. */
  collectionId?: number | null
}

export interface CreateAssetBody {
  title: string
  description?: string | null
  shortDescription?: string | null
  tags?: string[]
  categoryIds?: number[]
  collectionId?: number | null
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

export interface OrderConfirmation {
  id: string
  status: string
  txHash: string | null
}
