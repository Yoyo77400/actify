import { beforeEach, describe, expect, it, vi } from 'vitest'

// Couverture RGPD : droit à l'effacement (art. 17) et droit à la portabilité
// (art. 20). Ces deux routes sont les plus sensibles de l'API : elles sont
// d'ailleurs les seules protégées par requireTotp.
vi.mock('../services/prisma', () => ({
  prisma: {
    // softDeleteMe révoque les sessions : un jeton émis juste avant ne doit
    // pas survivre à l'effacement du compte.
    session: { create: vi.fn(), updateMany: vi.fn() },
    user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    wallet: { deleteMany: vi.fn() },
    listing: { findMany: vi.fn() },
    purchase: { findMany: vi.fn() },
    download: { findMany: vi.fn() },
    review: { findMany: vi.fn() },
    favorite: { findMany: vi.fn() },
    nft: { findMany: vi.fn() },
    resale: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../services/prisma'
import { exportMyData, softDeleteMe } from '../services/users.service'

const userFindUniqueOrThrow = vi.mocked(prisma.user.findUniqueOrThrow)
const userUpdate = vi.mocked(prisma.user.update)
const walletDeleteMany = vi.mocked(prisma.wallet.deleteMany)
const transaction = vi.mocked(prisma.$transaction)

const USER_ID = 'user-1'

// Une ligne `user` brute, telle qu'elle sort de la base : elle contient le
// secret TOTP, qui ne doit JAMAIS ressortir de l'API.
function rawUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    username: 'alice',
    displayName: 'Alice',
    email: 'alice@example.com',
    bio: 'Créatrice',
    avatarCid: 'avatar-key.png',
    bannerCid: 'banner-key.png',
    isVerified: true,
    twoFactorEnabled: true,
    twoFactorSecret: 'JBSWY3DPEHPK3PXP',
    createdAt: new Date('2026-01-01'),
    role: { name: 'user' },
    wallets: [{ id: 'w1', address: 'rAlice', chain: 'xrpl', label: null, isPrimary: true, createdAt: new Date() }],
    ...overrides,
  }
}

beforeEach(() => {
    vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 0 } as never)
  vi.clearAllMocks()
})

describe('softDeleteMe : droit à l\'effacement', () => {
  beforeEach(() => {
    walletDeleteMany.mockResolvedValue({ count: 1 } as never)
    userUpdate.mockResolvedValue({ id: USER_ID, deletedAt: new Date('2026-07-27') } as never)
    // $transaction reçoit ici un TABLEAU d'opérations (forme séquentielle).
    transaction.mockImplementation((async (ops: never) => Promise.all(ops as never)) as never)
  })

  it('supprime les wallets : seul identifiant du compte, il ne doit rien rester pour se reconnecter', async () => {
    await softDeleteMe(USER_ID)

    expect(walletDeleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
  })

  it('efface toutes les données personnelles et horodate la suppression', async () => {
    await softDeleteMe(USER_ID)

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: {
        deletedAt: expect.any(Date),
        username: null,
        displayName: null,
        email: null,
        bio: null,
        avatarCid: null,
        bannerCid: null,
      },
    })
  })

  it('exécute les deux opérations dans UNE transaction (pas de compte à moitié effacé)', async () => {
    await softDeleteMe(USER_ID)

    // Sans transaction, un échec entre les deux laisserait soit un compte
    // anonymisé encore connectable, soit des wallets orphelins.
    expect(transaction).toHaveBeenCalledOnce()
    expect(transaction.mock.calls[0]?.[0]).toHaveLength(2)
  })

  it('renvoie la date d\'effacement', async () => {
    const result = await softDeleteMe(USER_ID)

    expect(result).toMatchObject({ id: USER_ID, deletedAt: expect.any(Date) })
  })

  it('propage l\'échec de la transaction au lieu de prétendre avoir effacé', async () => {
    transaction.mockRejectedValue(new Error('deadlock detected'))

    await expect(softDeleteMe(USER_ID)).rejects.toThrow('deadlock detected')
  })
})

describe('exportMyData : droit à la portabilité', () => {
  beforeEach(() => {
    userFindUniqueOrThrow.mockResolvedValue(rawUser() as never)
    for (const model of ['listing', 'purchase', 'download', 'review', 'favorite', 'nft', 'resale'] as const) {
      vi.mocked(prisma[model].findMany).mockResolvedValue([] as never)
    }
  })

  it('rassemble les huit catégories de données de la personne concernée', async () => {
    const result = await exportMyData(USER_ID)

    expect(Object.keys(result).sort()).toEqual(
      ['downloads', 'exportedAt', 'favorites', 'listings', 'nftsOwned', 'profile', 'purchases', 'resales', 'reviews'].sort(),
    )
  })

  it('ne divulgue JAMAIS le secret TOTP dans l\'export', async () => {
    const result = await exportMyData(USER_ID)

    // Un export contenant le secret permettrait à quiconque intercepte le
    // fichier de générer les codes 2FA du compte.
    expect(JSON.stringify(result)).not.toContain('JBSWY3DPEHPK3PXP')
    expect(result.profile).not.toHaveProperty('twoFactorSecret')
  })

  it('inclut bien les données personnelles auxquelles la personne a droit', async () => {
    const result = await exportMyData(USER_ID)

    expect(result.profile).toMatchObject({
      id: USER_ID,
      username: 'alice',
      email: 'alice@example.com',
      bio: 'Créatrice',
    })
    expect(result.profile.wallets).toHaveLength(1)
  })

  it('n\'exporte que les données de l\'appelant, jamais celles d\'autrui', async () => {
    await exportMyData(USER_ID)

    // Chaque requête est filtrée sur l'identifiant de l'appelant, avec la
    // bonne colonne selon le modèle (sellerId, buyerId, currentOwnerId…).
    expect(prisma.listing.findMany).toHaveBeenCalledWith({ where: { sellerId: USER_ID } })
    expect(prisma.purchase.findMany).toHaveBeenCalledWith({ where: { buyerId: USER_ID } })
    expect(prisma.download.findMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
    expect(prisma.review.findMany).toHaveBeenCalledWith({ where: { reviewerId: USER_ID } })
    expect(prisma.favorite.findMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
    expect(prisma.nft.findMany).toHaveBeenCalledWith({ where: { currentOwnerId: USER_ID } })
    expect(prisma.resale.findMany).toHaveBeenCalledWith({ where: { sellerId: USER_ID } })
  })

  it('horodate l\'export (traçabilité de la demande)', async () => {
    const result = await exportMyData(USER_ID)

    expect(result.exportedAt).toBeInstanceOf(Date)
  })

  it('produit un export vide mais valide pour un compte sans activité', async () => {
    const result = await exportMyData(USER_ID)

    expect(result.listings).toEqual([])
    expect(result.purchases).toEqual([])
    expect(result.profile).toBeDefined()
  })
})
