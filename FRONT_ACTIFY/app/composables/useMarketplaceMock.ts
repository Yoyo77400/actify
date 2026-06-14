import type {
  AssetDetailPayload,
  ArtistPayload,
  CollectionCard,
  DropCard,
  EducationCard,
  HomePayload,
  MarketToken,
  SellerRow
} from '~/types/marketplace'

const heroImage = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80'
const coverImage = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80'
const artistCover = 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1800&q=80'
const assetImage = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80'

const trendingTokens: MarketToken[] = [
  { id: 'bonk', name: 'Bonk', symbol: 'BONK', image: 'https://picsum.photos/seed/bonk/80/80', priceLabel: '$626.5K', change: 18.82 },
  { id: 'gmx', name: 'GMX', symbol: 'GMX', image: 'https://picsum.photos/seed/gmx/80/80', priceLabel: '$9.3M', change: 3.13 },
  { id: 'moca', name: 'Moca', symbol: 'MOCA', image: 'https://picsum.photos/seed/moca/80/80', priceLabel: '$237.8K', change: 46.88 },
  { id: 'parcl', name: 'Parcl', symbol: 'PRCL', image: 'https://picsum.photos/seed/parcl/80/80', priceLabel: '$50.8M', change: 62.1 },
  { id: 'arb', name: 'Arbitrum', symbol: 'ARB', image: 'https://picsum.photos/seed/arb/80/80', priceLabel: '$991.4M', change: 3.9 },
  { id: 'blur', name: 'Blur', symbol: 'BLUR', image: 'https://picsum.photos/seed/blur/80/80', priceLabel: '$556.6M', change: -29.4 },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', image: 'https://picsum.photos/seed/eth/80/80', priceLabel: '$414.4K', change: 35.44 },
  { id: 'zro', name: 'LayerZero', symbol: 'ZRO', image: 'https://picsum.photos/seed/zro/80/80', priceLabel: '$190.5K', change: 62.57 }
]

const featuredCollections: CollectionCard[] = [
  { id: 'degenscape', name: 'Degenscape', floorPrice: '0.12 ETH', change: -35.59, image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80' },
  { id: 'pixel-pups', name: 'Pixel Pups', floorPrice: '0.77 ETH', change: 157.1, image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80' },
  { id: 'hv-mtl', name: 'HV-MTL Activated', floorPrice: '0.099 ETH', change: -2.34, image: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80' }
]

const sellers: SellerRow[] = [
  { id: 'courtyard', name: 'Courtyard.io', image: 'https://picsum.photos/seed/courtyard/60/60', floorPrice: '5.99', currency: 'USDC', change: 6.0, verified: true },
  { id: 'pudgy', name: 'Pudgy Penguins', image: 'https://picsum.photos/seed/pudgy/60/60', floorPrice: '4.19', currency: 'ETH', change: 22.7, verified: true },
  { id: 'punks', name: 'CryptoPunks', image: 'https://picsum.photos/seed/punks/60/60', floorPrice: '29.44', currency: 'ETH', change: 0, verified: true },
  { id: 'digi', name: 'DigiDaigaku', image: 'https://picsum.photos/seed/digidaigaku/60/60', floorPrice: '1.34', currency: 'ETH', change: -48.0, verified: true },
  { id: 'hypurr', name: 'Hypurr', image: 'https://picsum.photos/seed/hypurr/60/60', floorPrice: '495.18', currency: 'HYPE', change: -6.2, verified: true },
  { id: 'bayc', name: 'Bored Ape Yacht Club', image: 'https://picsum.photos/seed/bayc/60/60', floorPrice: '5.38', currency: 'ETH', change: 0, verified: true },
  { id: 'moonbirds', name: 'Moonbirds', image: 'https://picsum.photos/seed/moonbirds/60/60', floorPrice: '8.81', currency: 'ETH', change: -9.1, verified: true },
  { id: 'azuki', name: 'Azuki', image: 'https://picsum.photos/seed/azuki/60/60', floorPrice: '8.49', currency: 'ETH', change: -4.2, verified: true }
]

const featuredDrops: DropCard[] = [
  { id: 'drop-1', name: 'SWC Crypto Champions', subtitle: 'March 26 at 1:00 PM UTC', image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80' },
  { id: 'drop-2', name: 'BMON Hong Kong by Des Lucrece', subtitle: 'Live mint now', image: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=1200&q=80', badge: 'Mint live' },
  { id: 'drop-3', name: 'Playgrind : Job Edition', subtitle: 'March 27 at 10:00 PM UTC', image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=1200&q=80' }
]

const education: EducationCard[] = [
  { id: 'edu-1', title: 'What is an NFT?', image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80' },
  { id: 'edu-2', title: 'How to buy an NFT?', image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80' },
  { id: 'edu-3', title: 'What is minting?', image: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80' }
]

export const homeMock: HomePayload = {
  categories: [
    { id: 'all', label: 'All' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'art', label: 'Art' },
    { id: 'pfp', label: 'PFPs' },
    { id: 'more', label: 'More' }
  ],
  chains: [
    { id: 'all', label: 'All' },
    { id: 'eth', label: 'ETH' },
    { id: 'sol', label: 'SOL' },
    { id: 'base', label: 'BASE' },
    { id: 'avax', label: 'AVAX' },
    { id: 'matic', label: 'MATIC' }
  ],
  hero: [
    {
      id: 'mirror-stages-seed',
      title: 'Mirror Stages: Seed',
      creator: 'Boto',
      verified: true,
      image: heroImage,
      stats: [
        { label: 'Floor price', value: '0.12 ETH' },
        { label: 'Total items', value: '777' },
        { label: 'Edition', value: 'Open edition' },
        { label: 'Items minted', value: '$1' }
      ]
    },
    {
      id: 'synthetic-echoes',
      title: 'Synthetic Echoes',
      creator: 'Noema',
      verified: true,
      image: coverImage,
      stats: [
        { label: 'Floor price', value: '0.08 ETH' },
        { label: 'Total items', value: '420' },
        { label: 'Edition', value: 'Limited' },
        { label: 'Items minted', value: '$3' }
      ]
    }
  ],
  trendingTokens,
  featuredCollections,
  trendingCollections: trendingTokens.slice(0, 6),
  featuredDrops,
  topMovers: featuredCollections,
  featuredTokens: [
    { id: 'ark', name: 'Ark', floorPrice: 'FDV $2.3M', change: -0.1, image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80' },
    { id: 'kmno', name: 'Kamino KMNO', floorPrice: 'FDV $288.7M', change: 1.0, image: 'https://images.unsplash.com/photo-1639815188546-c43c240ff4df?auto=format&fit=crop&w=1200&q=80' },
    { id: 'arb-card', name: 'Arbitrum ARB', floorPrice: 'FDV $991.4M', change: 3.9, image: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=1200&q=80' }
  ],
  nft101: education,
  topSellers: sellers,
  weeklyShowcase: {
    title: 'Azuki Gate #0',
    subtitle: '7d sales: 737,283 APE',
    background: 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1400&q=80',
    items: [
      { id: 'sale-1', name: 'Azuki Gate #0', price: '2.12 APE', image: 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=800&q=80' },
      { id: 'sale-2', name: 'Azuki Gate #0', price: '2.12 APE', image: 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=800&q=80' },
      { id: 'sale-3', name: 'Azuki Gate #0', price: '2.12 APE', image: 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=800&q=80' }
    ]
  }
}

export const artistMock: Record<string, ArtistPayload> = {
  ethan22: {
    artist: {
      slug: 'ethan22',
      displayName: '#ETHAN22',
      username: '@ethan22',
      avatar: 'https://picsum.photos/seed/ethan22avatar/200/200',
      cover: artistCover,
      joinedAt: 'Joined Jan 2025',
      wallet: '#183HSN928...',
      bio: 'Créateur de visuels et modèles 3D orientés event, collectibles et licences digitales.',
      followersLabel: '1.3k followers'
    },
    collections: [
      {
        id: 'mountain-of-hell-collection-1',
        name: 'Mountain of Hell 25/26',
        image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
        description: 'A collection of 3D models and pictures to celebrate the 25/26 edition of Mountain of Hell.',
        buttonLabel: 'View'
      },
      {
        id: 'mountain-of-hell-collection-2',
        name: 'Mountain of Hell 25/26',
        image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
        description: 'A collection of 3D models and pictures to celebrate the 25/26 edition of Mountain of Hell.',
        buttonLabel: 'View'
      },
      {
        id: 'mountain-of-hell-collection-3',
        name: 'Mountain of Hell 25/26',
        image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
        description: 'A collection of 3D models and pictures to celebrate the 25/26 edition of Mountain of Hell.',
        buttonLabel: 'View'
      },
      {
        id: 'mountain-of-hell-collection-4',
        name: 'Mountain of Hell 25/26',
        image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
        description: 'A collection of 3D models and pictures to celebrate the 25/26 edition of Mountain of Hell.',
        buttonLabel: 'View'
      }
    ],
    items: Array.from({ length: 6 }).map((_, index) => ({
      id: `mountain-of-hell-${index + 1}`,
      name: 'Mountain of Hell 25/26',
      image: assetImage,
      cover: assetImage,
      price: '25.99',
      currency: '$',
      statusLabel: index === 4 ? 'Inactive' : 'Active',
      active: index !== 4,
      description: 'A licensable digital creation linked to the Mountain of Hell 25/26 universe.',
      creator: 'ethan22',
      contract: '01023920102020',
      chain: 'SOL',
      popularity: 3,
      salesCount: 27,
      lastSaleLabel: '01/12/25'
    }))
  }
}

export const assetMock: Record<string, AssetDetailPayload> = {
  'mountain-of-hell-1': {
    collectionName: 'Mountain of Hell 25/26',
    creatorVerified: true,
    tabs: [
      { id: 'description', label: 'Descriptions' },
      { id: 'orders', label: 'Orders' },
      { id: 'activity', label: 'Activity' }
    ],
    asset: artistMock.ethan22.items[0]
  }
}

export function getArtistMock(slug: string): ArtistPayload | undefined {
  return artistMock[slug] ?? artistMock.ethan22
}

export function getAssetMock(id: string): AssetDetailPayload | undefined {
  return assetMock[id] 
}
