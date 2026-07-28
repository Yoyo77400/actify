import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    listingCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
    listingTag: { deleteMany: vi.fn(), create: vi.fn() },
    tag: { upsert: vi.fn() },
    category: { count: vi.fn() },
    nft: { findUnique: vi.fn() },
    review: { aggregate: vi.fn(), groupBy: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('../services/entitlements.service', () => ({ resolveEntitlement: vi.fn() }))
vi.mock('../services/collections.service', () => ({ assertAssignableCollection: vi.fn() }))

import { prisma } from '../services/prisma'
import { resolveEntitlement } from '../services/entitlements.service'
import {
  createAsset,
  getAssetByIdOrSlug,
  publishAsset,
  softDeleteAsset,
  unpublishAsset,
  updateAsset,
} from '../services/assets.service'

const listingCreate = vi.mocked(prisma.listing.create)
const listingFindUnique = vi.mocked(prisma.listing.findUnique)
const listingFindUniqueOrThrow = vi.mocked(prisma.listing.findUniqueOrThrow)
const listingFindFirst = vi.mocked(prisma.listing.findFirst)
const listingUpdate = vi.mocked(prisma.listing.update)
const tagUpsert = vi.mocked(prisma.tag.upsert)
const listingTagCreate = vi.mocked(prisma.listingTag.create)
const categoryCount = vi.mocked(prisma.category.count)
const nftFindUnique = vi.mocked(prisma.nft.findUnique)
const reviewAggregate = vi.mocked(prisma.review.aggregate)
const transaction = vi.mocked(prisma.$transaction)
const entitlement = vi.mocked(resolveEntitlement)

const SELLER = 'seller-1'
const LISTING_ID = 'listing-1'

// La forme complète attendue par le sérialiseur (relations incluses).
function fullListing(overrides: Record<string, unknown> = {}) {
  return {
    id: LISTING_ID,
    slug: 'mon-asset',
    title: 'Mon asset',
    shortDescription: null,
    description: null,
    thumbnailCid: null,
    isFree: false,
    price: 10,
    currency: 'XRP',
    distributionMode: 'unlimited',
    maxDownloads: null,
    royaltyPercentage: 2.5,
    status: 'Published',
    viewsCount: 0,
    salesCount: 0,
    fileIpfsCid: 'stored-key.zip',
    sellerId: SELLER,
    deletedAt: null,
    createdAt: new Date('2026-07-01'),
    nft: null,
    seller: { id: SELLER, username: 'alice', displayName: 'Alice' },
    listingCategories: [],
    listingTags: [],
    ...overrides,
  }
}

// Doublure de transaction : exécute le callback avec le client mocké, comme
// le ferait Prisma.
function runTransaction() {
  transaction.mockImplementation((async (cb: (tx: unknown) => unknown) => cb(prisma)) as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  runTransaction()
  categoryCount.mockResolvedValue(0)
  listingFindUnique.mockResolvedValue(null) // slug libre par défaut
  listingCreate.mockResolvedValue({ id: LISTING_ID } as never)
  listingFindUniqueOrThrow.mockResolvedValue(fullListing() as never)
  listingUpdate.mockResolvedValue(fullListing() as never)
  reviewAggregate.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } } as never)
  entitlement.mockResolvedValue(null)
})

describe('createAsset : validation du titre (valeurs aux limites)', () => {
  it('refuse un titre de 2 caractères (juste en dessous de la borne)', async () => {
    await expect(createAsset(SELLER, { title: 'ab', isFree: true })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    expect(transaction).not.toHaveBeenCalled()
  })

  it('accepte un titre de 3 caractères (borne inférieure)', async () => {
    await expect(createAsset(SELLER, { title: 'abc', isFree: true })).resolves.toBeDefined()
  })

  it('accepte un titre de 200 caractères (borne supérieure)', async () => {
    await expect(createAsset(SELLER, { title: 'a'.repeat(200), isFree: true })).resolves.toBeDefined()
  })

  it('refuse un titre de 201 caractères (juste au-dessus de la borne)', async () => {
    await expect(createAsset(SELLER, { title: 'a'.repeat(201), isFree: true })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('refuse un titre composé uniquement d\'espaces (il est trimé avant mesure)', async () => {
    await expect(createAsset(SELLER, { title: '      ', isFree: true })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('enregistre le titre débarrassé de ses espaces de bord', async () => {
    await createAsset(SELLER, { title: '  Mon asset  ', isFree: true })

    expect(listingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: 'Mon asset' }) }),
    )
  })
})

describe('createAsset : validation du prix et des royalties (valeurs aux limites)', () => {
  it('refuse un asset payant sans prix', async () => {
    await expect(createAsset(SELLER, { title: 'Asset', isFree: false })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })

  it('refuse un asset payant à prix nul (0 n\'est pas un prix valide)', async () => {
    await expect(createAsset(SELLER, { title: 'Asset', isFree: false, basePrice: 0 })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('refuse un asset payant à prix négatif', async () => {
    await expect(createAsset(SELLER, { title: 'Asset', isFree: false, basePrice: -5 })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('accepte un asset gratuit sans prix', async () => {
    await expect(createAsset(SELLER, { title: 'Asset', isFree: true })).resolves.toBeDefined()
  })

  it('accepte une royalty de 0 bps (borne inférieure)', async () => {
    await expect(createAsset(SELLER, { title: 'Asset', isFree: true, royaltyBps: 0 })).resolves.toBeDefined()
  })

  it('accepte une royalty de 10000 bps = 100 % (borne supérieure)', async () => {
    await expect(createAsset(SELLER, { title: 'Asset', isFree: true, royaltyBps: 10000 })).resolves.toBeDefined()
  })

  it('refuse une royalty de 10001 bps', async () => {
    await expect(
      createAsset(SELLER, { title: 'Asset', isFree: true, royaltyBps: 10001 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('refuse une royalty négative', async () => {
    await expect(
      createAsset(SELLER, { title: 'Asset', isFree: true, royaltyBps: -1 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('convertit les points de base en pourcentage (250 bps → 2.5 %)', async () => {
    await createAsset(SELLER, { title: 'Asset', isFree: true, royaltyBps: 250 })

    // C'est ce pourcentage qui deviendra le TransferFee du NFT au mint.
    expect(listingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ royaltyPercentage: 2.5 }) }),
    )
  })
})

describe('createAsset : mode de distribution', () => {
  it.each(['unlimited', 'limited', 'unique'])('accepte le mode « %s »', async (mode) => {
    await expect(createAsset(SELLER, { title: 'Asset', isFree: true, distributionMode: mode })).resolves.toBeDefined()
  })

  it('refuse un mode inconnu', async () => {
    await expect(
      createAsset(SELLER, { title: 'Asset', isFree: true, distributionMode: 'illimite' }),
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
  })

  it('retient « unlimited » par défaut', async () => {
    await createAsset(SELLER, { title: 'Asset', isFree: true })

    expect(listingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ distributionMode: 'unlimited' }) }),
    )
  })
})

describe('createAsset : normalisation des tags', () => {
  beforeEach(() => {
    tagUpsert.mockImplementation((async ({ create }: never) => ({ id: 1, name: (create as { name: string }).name })) as never)
    listingTagCreate.mockResolvedValue({} as never)
  })

  it('met les tags en minuscules et supprime les espaces de bord', async () => {
    await createAsset(SELLER, { title: 'Asset', isFree: true, tags: ['  Wallpaper  ', 'DESIGN'] })

    const created = tagUpsert.mock.calls.map((call) => (call[0] as { create: { name: string } }).create.name)
    expect(created).toEqual(['wallpaper', 'design'])
  })

  it('déduplique les tags qui ne diffèrent que par la casse', async () => {
    await createAsset(SELLER, { title: 'Asset', isFree: true, tags: ['Design', 'design', 'DESIGN'] })

    expect(tagUpsert).toHaveBeenCalledTimes(1)
  })

  it('écarte les tags vides', async () => {
    await createAsset(SELLER, { title: 'Asset', isFree: true, tags: ['', '   ', 'valide'] })

    expect(tagUpsert).toHaveBeenCalledTimes(1)
  })

  it('accepte un tag de 32 caractères et rejette celui de 33 (borne)', async () => {
    await createAsset(SELLER, { title: 'Asset', isFree: true, tags: ['a'.repeat(32), 'b'.repeat(33)] })

    const created = tagUpsert.mock.calls.map((call) => (call[0] as { create: { name: string } }).create.name)
    expect(created).toEqual(['a'.repeat(32)])
  })
})

describe('createAsset : catégories et slug', () => {
  it('refuse une catégorie inexistante avant d\'écrire quoi que ce soit', async () => {
    // 2 ids demandés, 1 seul trouvé en base.
    categoryCount.mockResolvedValue(1)

    await expect(
      createAsset(SELLER, { title: 'Asset', isFree: true, categoryIds: [1, 2] }),
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(transaction).not.toHaveBeenCalled()
  })

  it('déduplique les ids de catégorie avant de compter', async () => {
    categoryCount.mockResolvedValue(1)

    await createAsset(SELLER, { title: 'Asset', isFree: true, categoryIds: [7, 7, 7] })

    expect(categoryCount).toHaveBeenCalledWith({ where: { id: { in: [7] } } })
  })

  it('dérive le slug du titre', async () => {
    await createAsset(SELLER, { title: 'Mon Super Asset', isFree: true })

    expect(listingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'mon-super-asset' }) }),
    )
  })

  it('suffixe le slug en cas de collision', async () => {
    listingFindUnique
      .mockResolvedValueOnce({ id: 'un-autre-asset' } as never) // 'asset' est pris
      .mockResolvedValueOnce(null) // 'asset-2' est libre

    await createAsset(SELLER, { title: 'Asset', isFree: true })

    expect(listingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'asset-2' }) }),
    )
  })
})

describe('publishAsset : un asset doit être tokenisé avant d\'être publié', () => {
  it('refuse la publication d\'un asset non tokenisé', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: SELLER, status: 'Draft' } as never)
    nftFindUnique.mockResolvedValue(null)

    await expect(publishAsset(SELLER, LISTING_ID)).rejects.toMatchObject({
      status: 409,
      code: 'NOT_TOKENIZED',
    })
    expect(listingUpdate).not.toHaveBeenCalled()
  })

  it('publie un brouillon tokenisé', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: SELLER, status: 'Draft' } as never)
    nftFindUnique.mockResolvedValue({ id: 'nft-1' } as never)

    await publishAsset(SELLER, LISTING_ID)

    expect(listingUpdate).toHaveBeenCalledWith({ where: { id: LISTING_ID }, data: { status: 'Published' } })
  })

  it('refuse de republier un asset déjà publié', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: SELLER, status: 'Published' } as never)

    await expect(publishAsset(SELLER, LISTING_ID)).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_ASSET_STATUS',
    })
    // Le statut est vérifié avant même de regarder le NFT.
    expect(nftFindUnique).not.toHaveBeenCalled()
  })

  it('404 pour un asset qui ne appartient pas à l\'appelant', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: 'someone-else', status: 'Draft' } as never)

    await expect(publishAsset(SELLER, LISTING_ID)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })
})

describe('unpublishAsset', () => {
  it('archive un asset publié', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: SELLER, status: 'Published' } as never)

    await unpublishAsset(SELLER, LISTING_ID)

    expect(listingUpdate).toHaveBeenCalledWith({ where: { id: LISTING_ID }, data: { status: 'Archived' } })
  })

  it('refuse de dépublier un brouillon', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: SELLER, status: 'Draft' } as never)

    await expect(unpublishAsset(SELLER, LISTING_ID)).rejects.toMatchObject({ code: 'INVALID_ASSET_STATUS' })
  })
})

describe('softDeleteAsset', () => {
  it('pose deletedAt au lieu de supprimer la ligne', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: SELLER, status: 'Draft' } as never)
    listingUpdate.mockResolvedValue({ id: LISTING_ID, deletedAt: new Date('2026-07-27') } as never)

    const result = await softDeleteAsset(SELLER, LISTING_ID)

    expect(listingUpdate).toHaveBeenCalledWith({
      where: { id: LISTING_ID },
      data: { deletedAt: expect.any(Date) },
    })
    expect(result.deletedAt).toBeInstanceOf(Date)
  })

  it('404 quand l\'appelant n\'est pas le vendeur', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: 'autre', status: 'Draft' } as never)

    await expect(softDeleteAsset(SELLER, LISTING_ID)).rejects.toMatchObject({ status: 404 })
  })
})

describe('getAssetByIdOrSlug : visibilité des brouillons', () => {
  it('renvoie un asset publié à un visiteur anonyme', async () => {
    listingFindFirst.mockResolvedValue(fullListing() as never)

    const result = await getAssetByIdOrSlug('mon-asset', null)

    expect(result).toMatchObject({ id: LISTING_ID, status: 'Published' })
  })

  it('masque un brouillon derrière un 404 pour un tiers', async () => {
    listingFindFirst.mockResolvedValue(fullListing({ status: 'Draft' }) as never)

    // Un 403 confirmerait l'existence de l'asset : on renvoie le même 404
    // qu'un identifiant inexistant.
    await expect(getAssetByIdOrSlug('mon-asset', 'un-curieux')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
  })

  it('laisse le créateur consulter son propre brouillon', async () => {
    listingFindFirst.mockResolvedValue(fullListing({ status: 'Draft' }) as never)

    await expect(getAssetByIdOrSlug('mon-asset', SELLER)).resolves.toMatchObject({ status: 'Draft' })
  })

  it('masque également un asset archivé à un tiers', async () => {
    listingFindFirst.mockResolvedValue(fullListing({ status: 'Archived' }) as never)

    await expect(getAssetByIdOrSlug('mon-asset', 'un-curieux')).rejects.toMatchObject({ status: 404 })
  })

  it('404 pour un identifiant inconnu', async () => {
    listingFindFirst.mockResolvedValue(null)

    await expect(getAssetByIdOrSlug('inconnu', null)).rejects.toMatchObject({ status: 404 })
  })
})

describe('getAssetByIdOrSlug : compteur de vues', () => {
  it('incrémente les vues d\'un asset publié', async () => {
    listingFindFirst.mockResolvedValue(fullListing() as never)

    await getAssetByIdOrSlug('mon-asset', null)

    expect(listingUpdate).toHaveBeenCalledWith({
      where: { id: LISTING_ID },
      data: { viewsCount: { increment: 1 } },
    })
  })

  it('n\'incrémente pas les vues quand le créateur relit son brouillon', async () => {
    listingFindFirst.mockResolvedValue(fullListing({ status: 'Draft' }) as never)

    await getAssetByIdOrSlug('mon-asset', SELLER)

    // Sinon un créateur gonflerait ses propres statistiques en rechargeant.
    expect(listingUpdate).not.toHaveBeenCalled()
  })
})

describe('getAssetByIdOrSlug : droit de téléchargement affiché au visiteur', () => {
  it('ne résout aucun droit pour un visiteur anonyme', async () => {
    listingFindFirst.mockResolvedValue(fullListing() as never)

    const result = await getAssetByIdOrSlug('mon-asset', null)

    expect(entitlement).not.toHaveBeenCalled()
    expect(result.viewerEntitlement).toEqual({ canDownload: false, reason: null })
  })

  it('expose le motif du droit pour un acheteur', async () => {
    listingFindFirst.mockResolvedValue(fullListing() as never)
    entitlement.mockResolvedValue('purchase')

    const result = await getAssetByIdOrSlug('mon-asset', 'buyer-1')

    expect(result.viewerEntitlement).toEqual({ canDownload: true, reason: 'purchase' })
  })

  it('ne propose pas le téléchargement quand aucun fichier n\'est attaché', async () => {
    listingFindFirst.mockResolvedValue(fullListing({ fileIpfsCid: null }) as never)

    const result = await getAssetByIdOrSlug('mon-asset', 'buyer-1')

    // Le bouton proposerait sinon un téléchargement qui répond 404.
    expect(entitlement).not.toHaveBeenCalled()
    expect(result.viewerEntitlement.canDownload).toBe(false)
  })
})

describe('getAssetByIdOrSlug : agrégat des avis', () => {
  it('arrondit la note moyenne à deux décimales', async () => {
    listingFindFirst.mockResolvedValue(fullListing() as never)
    reviewAggregate.mockResolvedValue({ _avg: { rating: 4.666666 }, _count: { _all: 3 } } as never)

    const result = await getAssetByIdOrSlug('mon-asset', null)

    expect(result.averageRating).toBe(4.67)
    expect(result.reviewsCount).toBe(3)
  })

  it('renvoie une note nulle quand l\'asset n\'a aucun avis', async () => {
    listingFindFirst.mockResolvedValue(fullListing() as never)

    const result = await getAssetByIdOrSlug('mon-asset', null)

    expect(result.averageRating).toBeNull()
    expect(result.reviewsCount).toBe(0)
  })
})

describe('sérialisation : ce qui ne doit pas fuiter', () => {
  it('n\'expose jamais la clé de stockage du fichier payant', async () => {
    listingFindFirst.mockResolvedValue(fullListing() as never)

    const result = await getAssetByIdOrSlug('mon-asset', null)

    // GET /files/:key sert le fichier sans contrôle de droits : la clé doit
    // rester côté serveur. On expose seulement un booléen.
    expect(result).not.toHaveProperty('fileIpfsCid')
    expect(result.hasFile).toBe(true)
  })

  it('reconvertit le pourcentage de royalty en points de base', async () => {
    listingFindFirst.mockResolvedValue(fullListing({ royaltyPercentage: 2.5 }) as never)

    const result = await getAssetByIdOrSlug('mon-asset', null)

    expect(result.royaltyBps).toBe(250)
  })

  it('signale un asset tokenisé avec les références on-chain', async () => {
    listingFindFirst.mockResolvedValue(
      fullListing({
        nft: { nftokenId: '000800AB', issuer: 'rIssuer', mintTxHash: 'F'.repeat(64) },
      }) as never,
    )

    const result = await getAssetByIdOrSlug('mon-asset', null)

    expect(result.tokenized).toBe(true)
    expect(result.nft).toEqual({ nftokenId: '000800AB', issuer: 'rIssuer', mintTxHash: 'F'.repeat(64) })
  })

  it('signale un asset non tokenisé', async () => {
    listingFindFirst.mockResolvedValue(fullListing({ nft: null }) as never)

    const result = await getAssetByIdOrSlug('mon-asset', null)

    expect(result.tokenized).toBe(false)
    expect(result.nft).toBeNull()
  })
})

describe('updateAsset', () => {
  beforeEach(() => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: SELLER, status: 'Draft' } as never)
    listingUpdate.mockResolvedValue({} as never)
  })

  it('404 quand l\'appelant n\'est pas le vendeur', async () => {
    listingFindFirst.mockResolvedValue({ id: LISTING_ID, sellerId: 'autre' } as never)

    await expect(updateAsset(SELLER, LISTING_ID, { title: 'Nouveau titre' })).rejects.toMatchObject({ status: 404 })
  })

  it('ne modifie que les champs fournis', async () => {
    await updateAsset(SELLER, LISTING_ID, { shortDescription: 'Résumé' })

    expect(listingUpdate).toHaveBeenCalledWith({
      where: { id: LISTING_ID },
      data: { shortDescription: 'Résumé' },
    })
  })

  it('regénère le slug quand le titre change', async () => {
    await updateAsset(SELLER, LISTING_ID, { title: 'Titre modifié' })

    expect(listingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'titre-modifie' }) }),
    )
  })

  it('conserve son propre slug si le titre inchangé le retrouve déjà pris par lui-même', async () => {
    // findUnique renvoie CE listing : ce n'est pas une collision.
    listingFindUnique.mockResolvedValue({ id: LISTING_ID } as never)

    await updateAsset(SELLER, LISTING_ID, { title: 'Mon asset' })

    expect(listingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'mon-asset' }) }),
    )
  })

  it('applique les mêmes bornes de validation qu\'à la création', async () => {
    await expect(updateAsset(SELLER, LISTING_ID, { title: 'ab' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
    await expect(updateAsset(SELLER, LISTING_ID, { royaltyBps: 10001 })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
    await expect(updateAsset(SELLER, LISTING_ID, { distributionMode: 'inconnu' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('permet de remettre la royalty à null', async () => {
    await updateAsset(SELLER, LISTING_ID, { royaltyBps: null })

    expect(listingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ royaltyPercentage: null }) }),
    )
  })

  it('n\'écrit rien quand aucun champ n\'est fourni', async () => {
    await updateAsset(SELLER, LISTING_ID, {})

    expect(listingUpdate).not.toHaveBeenCalled()
  })
})
