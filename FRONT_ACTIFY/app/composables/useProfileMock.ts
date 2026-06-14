import type { UserProfile } from '~/types/profile'

export const profileMock: UserProfile = {
  displayName: '#ETHAN22',
  username: '@ethan22',
  avatar: 'https://picsum.photos/seed/ethan22avatar/200/200',
  cover: 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1800&q=80',
  bio: 'Créateur de visuels et modèles 3D orientés event, collectibles et licences digitales. Passionné par le web3 et les expériences immersives.',
  joinedAt: 'Jan 2025',
  followersCount: 1342,
  followingCount: 89,
  wallet: {
    address: '0x183H...928f',
    balance: '4.82',
    currency: 'ETH',
    chain: 'Ethereum'
  },
  stats: [
    { label: 'Total sales', value: '12.4 ETH', change: 18.2 },
    { label: 'Items owned', value: '47' },
    { label: 'Collections', value: '4' },
    { label: 'Volume traded', value: '32.1 ETH', change: 5.7 }
  ],
  collections: [
    {
      id: 'mountain-of-hell-collection-1',
      name: 'Mountain of Hell 25/26',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      itemCount: 24,
      floorPrice: '0.12 ETH'
    },
    {
      id: 'synthetic-echoes-col',
      name: 'Synthetic Echoes',
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      itemCount: 12,
      floorPrice: '0.08 ETH'
    },
    {
      id: 'neon-drift',
      name: 'Neon Drift',
      image: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=1200&q=80',
      itemCount: 8,
      floorPrice: '0.25 ETH'
    },
    {
      id: 'digital-flora',
      name: 'Digital Flora',
      image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
      itemCount: 31,
      floorPrice: '0.04 ETH'
    }
  ],
  activity: [
    { id: 'act-1', type: 'sale', label: 'Sold', item: 'Mountain of Hell #12', price: '0.45', currency: 'ETH', date: '2 hours ago' },
    { id: 'act-2', type: 'purchase', label: 'Bought', item: 'Neon Drift #03', price: '0.25', currency: 'ETH', date: '1 day ago' },
    { id: 'act-3', type: 'mint', label: 'Minted', item: 'Digital Flora #31', price: '0.02', currency: 'ETH', date: '3 days ago' },
    { id: 'act-4', type: 'transfer', label: 'Transferred', item: 'Synthetic Echoes #07', price: '—', currency: '', date: '5 days ago' },
    { id: 'act-5', type: 'sale', label: 'Sold', item: 'Mountain of Hell #08', price: '0.38', currency: 'ETH', date: '1 week ago' }
  ]
}