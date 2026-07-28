import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

vi.mock('../services/prisma', () => ({
  prisma: { user: { findUniqueOrThrow: vi.fn() } },
}))

import { prisma } from '../services/prisma'
import { requireRole } from '../middlewares/role.middleware'

const userFindUniqueOrThrow = vi.mocked(prisma.user.findUniqueOrThrow)

// Doublures minimales d'Express : le middleware ne lit que req.user et
// n'appelle que next(). `res` n'est jamais touché sur ce chemin.
function fakeReq(userId = 'user-1') {
  return { user: { id: userId } } as unknown as Request
}

const res = {} as Response

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requireRole', () => {
  it('laisse passer un utilisateur portant exactement le rôle demandé', async () => {
    userFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', role: { name: 'moderator' } } as never)
    const next = vi.fn() as NextFunction

    await requireRole('moderator')(fakeReq(), res, next)

    // next() sans argument = la requête continue.
    expect(next).toHaveBeenCalledWith()
  })

  it('laisse passer un admin même sur un rôle qu\'il ne porte pas (l\'admin domine)', async () => {
    userFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', role: { name: 'admin' } } as never)
    const next = vi.fn() as NextFunction

    await requireRole('moderator')(fakeReq(), res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('accepte l\'un quelconque des rôles autorisés', async () => {
    userFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', role: { name: 'support' } } as never)
    const next = vi.fn() as NextFunction

    await requireRole('moderator', 'support')(fakeReq(), res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('bloque en 403 un rôle insuffisant, en nommant le rôle attendu', async () => {
    userFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', role: { name: 'user' } } as never)
    const next = vi.fn() as NextFunction

    await requireRole('moderator')(fakeReq(), res, next)

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403, code: 'FORBIDDEN', message: 'Rôle requis : moderator' }),
    )
  })

  it('liste tous les rôles acceptés dans le message d\'erreur', async () => {
    userFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', role: { name: 'user' } } as never)
    const next = vi.fn() as NextFunction

    await requireRole('moderator', 'support')(fakeReq(), res, next)

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Rôle requis : moderator ou support' }),
    )
  })

  it('lit le rôle en base et non une valeur portée par la requête', async () => {
    userFindUniqueOrThrow.mockResolvedValue({ id: 'user-42', role: { name: 'admin' } } as never)
    const next = vi.fn() as NextFunction

    await requireRole('admin')(fakeReq('user-42'), res, next)

    // Un rôle lu depuis le jeton serait figé à l'émission : un bannissement ou
    // une rétrogradation ne prendrait effet qu'à l'expiration du jeton.
    expect(userFindUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'user-42' },
      include: { role: true },
    })
  })

  it('transmet à next() l\'erreur d\'un utilisateur introuvable au lieu de crasher', async () => {
    // Doublure qui lève : findUniqueOrThrow rejette quand la ligne n'existe pas.
    const dbError = new Error('No User found')
    userFindUniqueOrThrow.mockRejectedValue(dbError)
    const next = vi.fn() as NextFunction

    await requireRole('admin')(fakeReq(), res, next)

    // Le middleware attrape et délègue au gestionnaire d'erreurs central :
    // une exception non capturée ici ferait tomber la requête en timeout.
    expect(next).toHaveBeenCalledWith(dbError)
  })
})
