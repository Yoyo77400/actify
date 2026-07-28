import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    listing: { count: vi.fn() },
    purchase: { count: vi.fn() },
    download: { count: vi.fn() },
    review: { count: vi.fn() },
    favorite: { count: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { getMe, updateMe } from '../services/users.service'

const userFindUnique = vi.mocked(prisma.user.findUnique)
const userFindUniqueOrThrow = vi.mocked(prisma.user.findUniqueOrThrow)
const userUpdate = vi.mocked(prisma.user.update)

const USER_ID = 'user-1'

function storedUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    username: 'alice',
    displayName: 'Alice',
    email: 'alice@example.com',
    bio: null,
    avatarCid: null,
    bannerCid: null,
    isVerified: false,
    twoFactorEnabled: false,
    twoFactorSecret: 'SECRET-TOTP',
    createdAt: new Date('2026-01-01'),
    role: { name: 'user' },
    wallets: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  userFindUnique.mockResolvedValue(null) // pseudo libre par défaut
  userUpdate.mockResolvedValue(storedUser() as never)
})

describe('updateMe : format du pseudo (valeurs aux limites)', () => {
  it('refuse un pseudo de 2 caractères (sous la borne)', async () => {
    await expect(updateMe(USER_ID, { username: 'ab' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('accepte un pseudo de 3 caractères (borne inférieure)', async () => {
    await expect(updateMe(USER_ID, { username: 'abc' })).resolves.toBeDefined()
  })

  it('accepte un pseudo de 32 caractères (borne supérieure)', async () => {
    await expect(updateMe(USER_ID, { username: 'a'.repeat(32) })).resolves.toBeDefined()
  })

  it('refuse un pseudo de 33 caractères (au-dessus de la borne)', async () => {
    await expect(updateMe(USER_ID, { username: 'a'.repeat(33) })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('accepte lettres, chiffres et underscore', async () => {
    await expect(updateMe(USER_ID, { username: 'Alice_42' })).resolves.toBeDefined()
  })

  it.each(['alice bob', 'alice-bob', 'alice@bob', 'alice.bob', 'alice/bob', 'alice<script>'])(
    'refuse le pseudo interdit « %s »',
    async (username) => {
      await expect(updateMe(USER_ID, { username })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    },
  )

  it('refuse un pseudo contenant un caractère accentué', async () => {
    await expect(updateMe(USER_ID, { username: 'élodie' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('permet d\'effacer son pseudo en passant null (sans contrôle de format)', async () => {
    await updateMe(USER_ID, { username: null })

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ username: null }) }),
    )
    // Aucune vérification d'unicité n'a de sens pour null.
    expect(userFindUnique).not.toHaveBeenCalled()
  })
})

describe('updateMe : unicité du pseudo', () => {
  it('refuse un pseudo déjà pris par quelqu\'un d\'autre', async () => {
    userFindUnique.mockResolvedValue({ id: 'un-autre-user' } as never)

    await expect(updateMe(USER_ID, { username: 'alice' })).rejects.toMatchObject({
      status: 409,
      code: 'USERNAME_TAKEN',
    })
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('accepte que l\'utilisateur « reprenne » son propre pseudo', async () => {
    userFindUnique.mockResolvedValue({ id: USER_ID } as never)

    // Sans ce cas, renvoyer le formulaire de profil sans changer le pseudo
    // renverrait un 409.
    await expect(updateMe(USER_ID, { username: 'alice' })).resolves.toBeDefined()
  })
})

describe('updateMe : longueur des champs libres (valeurs aux limites)', () => {
  it('accepte un display name de 60 caractères (borne)', async () => {
    await expect(updateMe(USER_ID, { displayName: 'a'.repeat(60) })).resolves.toBeDefined()
  })

  it('refuse un display name de 61 caractères', async () => {
    await expect(updateMe(USER_ID, { displayName: 'a'.repeat(61) })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  })

  it('accepte une bio de 500 caractères (borne)', async () => {
    await expect(updateMe(USER_ID, { bio: 'a'.repeat(500) })).resolves.toBeDefined()
  })

  it('refuse une bio de 501 caractères', async () => {
    await expect(updateMe(USER_ID, { bio: 'a'.repeat(501) })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('autorise la remise à null du display name et de la bio', async () => {
    await updateMe(USER_ID, { displayName: null, bio: null })

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ displayName: null, bio: null }) }),
    )
  })
})

describe('updateMe : champs non fournis', () => {
  it('ne touche pas aux champs absents de la requête', async () => {
    await updateMe(USER_ID, { bio: 'Nouvelle bio' })

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER_ID }, data: { bio: 'Nouvelle bio' } }),
    )
  })

  it('n\'écrit aucun champ quand l\'entrée est vide', async () => {
    await updateMe(USER_ID, {})

    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: {} }))
  })

  it('met à jour avatar et bannière quand ils sont fournis', async () => {
    await updateMe(USER_ID, { avatarCid: 'a.png', bannerCid: 'b.png' })

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { avatarCid: 'a.png', bannerCid: 'b.png' } }),
    )
  })

  it('ne renvoie jamais le secret TOTP dans la réponse', async () => {
    const result = await updateMe(USER_ID, { bio: 'Coucou' })

    expect(result).not.toHaveProperty('twoFactorSecret')
    expect(JSON.stringify(result)).not.toContain('SECRET-TOTP')
  })
})

describe('getMe', () => {
  beforeEach(() => {
    userFindUniqueOrThrow.mockResolvedValue(storedUser() as never)
    vi.mocked(prisma.listing.count).mockResolvedValue(3)
    vi.mocked(prisma.purchase.count).mockResolvedValue(2)
    vi.mocked(prisma.download.count).mockResolvedValue(7)
    vi.mocked(prisma.review.count).mockResolvedValue(1)
    vi.mocked(prisma.favorite.count).mockResolvedValue(5)
  })

  it('renvoie le profil accompagné de ses compteurs', async () => {
    const result = await getMe(USER_ID)

    expect(result).toMatchObject({ id: USER_ID, username: 'alice', role: 'user' })
    expect(result.stats).toEqual({
      listingsCount: 3,
      purchasesCount: 2,
      downloadsCount: 7,
      reviewsCount: 1,
      favoritesCount: 5,
    })
  })

  it('ne divulgue pas le secret TOTP', async () => {
    const result = await getMe(USER_ID)

    expect(result).not.toHaveProperty('twoFactorSecret')
  })

  it('compte les statistiques du seul appelant', async () => {
    await getMe(USER_ID)

    expect(prisma.listing.count).toHaveBeenCalledWith({ where: { sellerId: USER_ID } })
    expect(prisma.purchase.count).toHaveBeenCalledWith({ where: { buyerId: USER_ID } })
    expect(prisma.review.count).toHaveBeenCalledWith({ where: { reviewerId: USER_ID } })
  })
})
