import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../services/prisma'
import { AppError } from '../utils/http'
import { extractBearerToken, verifyToken } from '../utils/jwt'

// Decoupled from however the token was issued (wallet-connect today, maybe
// more chains or Auth2 later) — anything that signs a JWT with { sub: userId }
// using JWT_SECRET is a valid session here.
async function resolveUser(token: string) {
  const payload = verifyToken(token)
  // Seuls les jetons d'accès (sans `type`) ouvrent une session : on rejette le
  // refresh ET le jeton intermédiaire '2fa', qui ne prouve que le 1er facteur.
  if (!payload || payload.type) return null

  const userId = payload.sub
  if (!userId || typeof userId !== 'string') return null

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.deletedAt) return null
  // mfa remonte du jeton (posé à /auth/verify-2fa) jusqu'à req.user pour requireTotp.
  return { user, mfa: payload.mfa === true }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.header('authorization'))
    if (!token) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Token manquant ou invalide')
    }

    const resolved = await resolveUser(token)
    if (!resolved) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Token manquant ou invalide')
    }
    if (resolved.user.isBanned) {
      throw new AppError(403, 'USER_BANNED', 'Compte banni')
    }

    req.user = { id: resolved.user.id, mfa: resolved.mfa }
    next()
  } catch (err) {
    next(err)
  }
}

// À placer APRÈS requireAuth. Exige que la session ait franchi le second
// facteur (mfa:true dans le jeton d'accès, posé par /auth/verify-2fa). Un
// compte sans 2FA ne peut donc pas atteindre les routes ainsi gardées — c'est
// voulu : ces actions sensibles imposent la 2FA (spec Auth2).
export function requireTotp(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.mfa) {
    return next(new AppError(403, 'TWO_FACTOR_REQUIRED', 'Authentification à deux facteurs requise pour cette action'))
  }
  next()
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
      const resolved = await resolveUser(token)
      if (!resolved) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Token manquant ou invalide')
      }
      if (resolved.user.isBanned) {
        throw new AppError(403, 'USER_BANNED', 'Compte banni')
      }
      req.user = { id: resolved.user.id, mfa: resolved.mfa }
    }
    next()
  } catch (err) {
    next(err)
  }
}
