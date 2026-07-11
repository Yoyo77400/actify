import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../services/prisma'
import { AppError } from '../utils/http'
import { extractBearerToken, verifyToken } from '../utils/jwt'

// Decoupled from however the token was issued (wallet-connect today, maybe
// more chains or Auth2 later) — anything that signs a JWT with { sub: userId }
// using JWT_SECRET is a valid session here.
async function resolveUser(token: string) {
  const payload = verifyToken(token)
  if (!payload || payload.type === 'refresh') return null

  const userId = payload.sub
  if (!userId || typeof userId !== 'string') return null

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.deletedAt) return null
  return user
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.header('authorization'))
    if (!token) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Token manquant ou invalide')
    }

    const user = await resolveUser(token)
    if (!user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Token manquant ou invalide')
    }
    if (user.isBanned) {
      throw new AppError(403, 'USER_BANNED', 'Compte banni')
    }

    req.user = { id: user.id }
    next()
  } catch (err) {
    next(err)
  }
}

// Attaches req.user when a valid access token is present; anonymous callers
// pass through. POST /wallets/verify behaves differently depending on whether
// the caller already has a session (link) or not (login/signup).
// A PRESENTED token that turns out invalid/expired is rejected instead of
// silently downgraded to anonymous: downgrading would turn a wallet-link
// attempt into a signup that binds the wallet to a fresh orphan account.
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.header('authorization'))
    if (token) {
      const user = await resolveUser(token)
      if (!user) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Token manquant ou invalide')
      }
      if (user.isBanned) {
        throw new AppError(403, 'USER_BANNED', 'Compte banni')
      }
      req.user = { id: user.id }
    }
    next()
  } catch (err) {
    next(err)
  }
}
