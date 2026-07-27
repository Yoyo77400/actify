export interface Collection {
  id: number
  name: string
  slug: string
  /** Cover image URL stored on the collection, if any. */
  img: string | null
  /** Published listings only — drafts are never counted publicly. */
  listingCount: number
}
