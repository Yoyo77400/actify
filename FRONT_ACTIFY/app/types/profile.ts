export interface ProfileWallet {
  address: string
  balance: string
  currency: string
  chain: string
}

export interface ProfileStat {
  label: string
  value: string
  change?: number
}

export interface ProfileActivity {
  id: string
  type: 'sale' | 'purchase' | 'mint' | 'transfer'
  label: string
  item: string
  price: string
  currency: string
  date: string
}

export interface ProfileCollection {
  id: string
  name: string
  image: string
  itemCount: number
  floorPrice: string
}

export interface UserProfile {
  displayName: string
  username: string
  avatar: string
  cover: string
  bio: string
  joinedAt: string
  followersCount: number
  followingCount: number
  wallet: ProfileWallet
  stats: ProfileStat[]
  collections: ProfileCollection[]
  activity: ProfileActivity[]
}