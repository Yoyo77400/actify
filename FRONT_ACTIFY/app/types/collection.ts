export interface Collection {
  id: number
  name: string
  slug: string
  /** Cover image URL stored on the collection, if any. */
  img: string | null
  /** Publiés seulement pour un visiteur ; brouillons inclus pour le propriétaire. */
  listingCount: number
  /** Vrai quand le visiteur est le propriétaire : il voit alors ses brouillons. */
  isOwner?: boolean
}
