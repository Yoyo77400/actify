import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findFirst: vi.fn(), update: vi.fn() },
    user: { update: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { setAssetFile, setAssetThumbnail, setUserAvatar, setUserBanner } from '../services/uploads.service'

const listingFindFirst = vi.mocked(prisma.listing.findFirst)
const listingUpdate = vi.mocked(prisma.listing.update)
const userUpdate = vi.mocked(prisma.user.update)

const OWNER = 'seller-1'
const LISTING_ID = 'listing-1'
const KEY = '550e8400-e29b-41d4-a716-446655440000.zip'

beforeEach(() => {
  vi.clearAllMocks()
  listingUpdate.mockResolvedValue({} as never)
  userUpdate.mockResolvedValue({} as never)
})

describe('setAssetFile', () => {
  it('enregistre la clé de stockage sur l\'asset du propriétaire', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: OWNER } as never)

    const result = await setAssetFile(OWNER, LISTING_ID, KEY)

    expect(listingUpdate).toHaveBeenCalledWith({ where: { id: LISTING_ID }, data: { fileIpfsCid: KEY } })
    expect(result).toEqual({ hasFile: true })
  })

  it('refuse d\'attacher un fichier à l\'asset d\'un autre vendeur', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: 'quelqu-un-dautre' } as never)

    // Sans ce contrôle, n'importe qui remplacerait le fichier vendu par un
    // autre créateur.
    await expect(setAssetFile(OWNER, LISTING_ID, KEY)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(listingUpdate).not.toHaveBeenCalled()
  })

  it('refuse un asset inexistant', async () => {
    listingFindFirst.mockResolvedValue(null)

    await expect(setAssetFile(OWNER, LISTING_ID, KEY)).rejects.toMatchObject({ status: 404 })
  })

  it('ignore les assets supprimés (deletedAt non nul)', async () => {
    listingFindFirst.mockResolvedValue(null)

    await setAssetFile(OWNER, LISTING_ID, KEY).catch(() => {})

    expect(listingFindFirst).toHaveBeenCalledWith({ where: { id: LISTING_ID, deletedAt: null } })
  })
})

describe('setAssetThumbnail', () => {
  it('enregistre la miniature et renvoie sa clé', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: OWNER } as never)

    const result = await setAssetThumbnail(OWNER, LISTING_ID, 'thumb.webp')

    expect(listingUpdate).toHaveBeenCalledWith({ where: { id: LISTING_ID }, data: { thumbnailCid: 'thumb.webp' } })
    expect(result).toEqual({ thumbnailCid: 'thumb.webp' })
  })

  it('applique le même contrôle de propriété que le fichier principal', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: 'autre' } as never)

    await expect(setAssetThumbnail(OWNER, LISTING_ID, 'thumb.webp')).rejects.toMatchObject({ status: 404 })
  })
})

describe('setUserAvatar / setUserBanner', () => {
  it('écrit l\'avatar sur le profil de l\'appelant', async () => {
    const result = await setUserAvatar('user-1', 'avatar.png')

    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { avatarCid: 'avatar.png' } })
    expect(result).toEqual({ avatarCid: 'avatar.png' })
  })

  it('écrit la bannière sur le profil de l\'appelant', async () => {
    const result = await setUserBanner('user-1', 'banner.png')

    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { bannerCid: 'banner.png' } })
    expect(result).toEqual({ bannerCid: 'banner.png' })
  })

  it('cible toujours l\'identifiant de session, jamais un identifiant fourni par le client', async () => {
    await setUserAvatar('user-session', 'avatar.png')

    // La signature ne prend pas d'id cible : impossible d'écrire sur le profil
    // d'un autre utilisateur depuis cette couche.
    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-session' } }))
  })
})
