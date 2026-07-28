import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

vi.mock('../services/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

import { prisma } from '../services/prisma'
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware'
import { signAccessToken, signPendingTotpToken, signRefreshToken } from '../utils/jwt'

const userFindUnique = vi.mocked(prisma.user.findUnique)

const USER_ID = 'user-1'

function activeUser(overrides: Record<string, unknown> = {}) {
  return { id: USER_ID, deletedAt: null, isBanned: false, twoFactorEnabled: false, ...overrides }
}

// Exécute le middleware et renvoie la requête (pour inspecter req.user) et
// l'espion next() (pour inspecter l'erreur éventuelle).
async function run(
  middleware: typeof requireAuth,
  authorization: string | undefined,
) {
  const req = { header: (name: string) => (name === 'authorization' ? authorization : undefined) } as unknown as Request
  const next = vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>
  await middleware(req, {} as Response, next)
  return { req: req as Request & { user?: unknown }, next }
}

beforeEach(() => {
  vi.clearAllMocks()
  userFindUnique.mockResolvedValue(activeUser() as never)
})

describe('requireAuth : jeton absent ou malformé', () => {
  it('rejette une requête sans en-tête Authorization', async () => {
    const { next } = await run(requireAuth, undefined)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401, code: 'AUTH_REQUIRED' }))
    expect(userFindUnique).not.toHaveBeenCalled()
  })

  it('rejette un en-tête sans le préfixe « Bearer »', async () => {
    const { next } = await run(requireAuth, signAccessToken(USER_ID))

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }))
  })

  it('rejette un jeton illisible', async () => {
    const { next } = await run(requireAuth, 'Bearer nimportequoi')

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401, code: 'AUTH_REQUIRED' }))
  })

  it('rejette un jeton signé avec un autre secret', async () => {
    // Jeton bien formé et réellement signé, mais avec une clé qui n'est pas
    // celle de l'API. Généré à la volée : aucun jeton n'est écrit en dur ici.
    const foreign = jwt.sign({ sub: USER_ID }, 'une-autre-cle-de-signature')
    const { next } = await run(requireAuth, `Bearer ${foreign}`)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }))
  })
})

describe('requireAuth : seul le jeton d\'accès ouvre une session', () => {
  it('accepte un jeton d\'accès et attache l\'utilisateur à la requête', async () => {
    const { req, next } = await run(requireAuth, `Bearer ${signAccessToken(USER_ID)}`)

    expect(next).toHaveBeenCalledWith()
    expect(req.user).toEqual({ id: USER_ID, mfa: false, twoFactorEnabled: false })
  })

  it('REFUSE un jeton de rafraîchissement présenté comme session', async () => {
    const { req, next } = await run(requireAuth, `Bearer ${signRefreshToken(USER_ID)}`)

    // Le refresh ne sert qu'à obtenir un nouvel access token : l'accepter ici
    // donnerait une session de 7 jours au lieu de 15 minutes.
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401, code: 'AUTH_REQUIRED' }))
    expect(req.user).toBeUndefined()
  })

  it('REFUSE un jeton 2FA en attente (1er facteur seulement)', async () => {
    const { req, next } = await run(requireAuth, `Bearer ${signPendingTotpToken(USER_ID)}`)

    // Sinon la 2FA serait contournable : le jeton intermédiaire ouvrirait déjà
    // une session complète sans avoir fourni le code.
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }))
    expect(req.user).toBeUndefined()
  })

  it('propage le drapeau mfa d\'une session ayant validé le 2e facteur', async () => {
    userFindUnique.mockResolvedValue(activeUser({ twoFactorEnabled: true }) as never)

    const { req } = await run(requireAuth, `Bearer ${signAccessToken(USER_ID, { mfa: true })}`)

    // C'est ce drapeau que requireTotp lit pour les actions sensibles.
    expect(req.user).toEqual({ id: USER_ID, mfa: true, twoFactorEnabled: true })
  })
})

describe('requireAuth : état du compte revérifié à chaque requête', () => {
  it('rejette un jeton valide dont le compte n\'existe plus', async () => {
    userFindUnique.mockResolvedValue(null)

    const { next } = await run(requireAuth, `Bearer ${signAccessToken(USER_ID)}`)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }))
  })

  it('rejette un jeton valide dont le compte a été supprimé (RGPD)', async () => {
    userFindUnique.mockResolvedValue(activeUser({ deletedAt: new Date() }) as never)

    // Le jeton reste cryptographiquement valide jusqu'à 15 min après la
    // suppression : c'est la relecture en base qui coupe l'accès immédiatement.
    const { next } = await run(requireAuth, `Bearer ${signAccessToken(USER_ID)}`)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }))
  })

  it('rejette un compte banni avec un 403 distinct', async () => {
    userFindUnique.mockResolvedValue(activeUser({ isBanned: true }) as never)

    const { next } = await run(requireAuth, `Bearer ${signAccessToken(USER_ID)}`)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403, code: 'USER_BANNED' }))
  })

  it('relit le compte en base à chaque requête plutôt que de croire le jeton', async () => {
    await run(requireAuth, `Bearer ${signAccessToken(USER_ID)}`)

    expect(userFindUnique).toHaveBeenCalledWith({ where: { id: USER_ID } })
  })
})

describe('optionalAuth', () => {
  it('laisse passer un visiteur anonyme sans attacher d\'utilisateur', async () => {
    const { req, next } = await run(optionalAuth, undefined)

    expect(next).toHaveBeenCalledWith()
    expect(req.user).toBeUndefined()
    expect(userFindUnique).not.toHaveBeenCalled()
  })

  it('attache l\'utilisateur quand un jeton valide est présenté', async () => {
    const { req, next } = await run(optionalAuth, `Bearer ${signAccessToken(USER_ID)}`)

    expect(next).toHaveBeenCalledWith()
    expect(req.user).toMatchObject({ id: USER_ID })
  })

  it('REJETTE un jeton présenté mais invalide, au lieu de basculer en anonyme', async () => {
    const { req, next } = await run(optionalAuth, 'Bearer jeton-expire-ou-corrompu')

    // Comportement clé : un downgrade silencieux transformerait une tentative
    // de RATTACHEMENT de wallet en INSCRIPTION, liant le wallet à un compte
    // orphelin tout neuf (cf. POST /wallets/verify).
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401, code: 'AUTH_REQUIRED' }))
    expect(req.user).toBeUndefined()
  })

  it('rejette également un compte banni qui présente un jeton valide', async () => {
    userFindUnique.mockResolvedValue(activeUser({ isBanned: true }) as never)

    const { next } = await run(optionalAuth, `Bearer ${signAccessToken(USER_ID)}`)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403, code: 'USER_BANNED' }))
  })

  it('transmet à next() une panne de base plutôt que de laisser passer anonymement', async () => {
    const dbError = new Error('connection lost')
    userFindUnique.mockRejectedValue(dbError)

    const { next } = await run(optionalAuth, `Bearer ${signAccessToken(USER_ID)}`)

    expect(next).toHaveBeenCalledWith(dbError)
  })
})
