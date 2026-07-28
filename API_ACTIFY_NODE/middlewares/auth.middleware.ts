import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/http'
import { verifyToken } from '../utils/jwt'
import { readAccessToken } from '../utils/auth-cookies'
import { findUsableSession } from '../services/sessions.service'

// Decoupled from however the token was issued (wallet-connect today, maybe
// more chains or Auth2 later) — anything that signs a JWT with { sub: userId }
// using JWT_SECRET is a valid session here.
async function resolveUser(token: string) {
  const payload = verifyToken(token)
  // Seuls les jetons d'accès (sans `type`) ouvrent une session : rejette le
  // refresh et le pending '2fa', qui ne prouvent que le 1er facteur.
  if (!payload || payload.type) return null

  const userId = payload.sub
  if (!userId || typeof userId !== 'string') return null

  // Le jeton doit désigner une session serveur encore vivante. Un jeton sans
  // `sid` (émis avant les sessions) n'ouvre plus rien : sa signature reste
  // valide, mais plus rien ne permettrait de le révoquer.
  const sid = payload.sid
  if (!sid || typeof sid !== 'string') return null

  // Une seule requête : la session porte son utilisateur, ce qui remplace la
  // lecture user d'avant plutôt que de s'y ajouter.
  const session = await findUsableSession(sid)
  if (!session) return null

  return { user: session.user, mfa: payload.mfa === true, sessionId: session.id }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readAccessToken(req)
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

    req.user = {
      id: resolved.user.id,
      mfa: resolved.mfa,
      twoFactorEnabled: resolved.user.twoFactorEnabled,
      sessionId: resolved.sessionId,
    }
    next()
  } catch (err) {
    next(err)
  }
}

// À placer après requireAuth. Step-up réservé aux comptes ayant ACTIVÉ la
// 2FA : leur session doit avoir validé le 2e facteur (mfa:true, préservé au
// refresh). Pour les autres, la signature wallet du login est l'unique
// facteur — on ne bloque pas une action que le front ne sait pas re-challenger.
export function requireTotp(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || (req.user.twoFactorEnabled && !req.user.mfa)) {
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
    const token = readAccessToken(req)
    if (token) {
      const resolved = await resolveUser(token)
      if (!resolved) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Token manquant ou invalide')
      }
      if (resolved.user.isBanned) {
        throw new AppError(403, 'USER_BANNED', 'Compte banni')
      }
      req.user = {
        id: resolved.user.id,
        mfa: resolved.mfa,
        twoFactorEnabled: resolved.user.twoFactorEnabled,
        sessionId: resolved.sessionId,
      }
    }
    next()
  } catch (err) {
    next(err)
  }
}

/**
 * optionalAuth uniquement pour une liaison de wallet.
 *
 * Depuis que la session vit dans un cookie httpOnly, le navigateur la joint à
 * TOUTES les requêtes, y compris une tentative de connexion. Or optionalAuth
 * rejette un jeton présenté mais invalide (401) — un cookie périmé ou révoqué
 * empêchait donc de se reconnecter, notamment juste après une suppression de
 * compte. L'intention déclarée par le client fait foi : hors liaison, la
 * signature du wallet EST l'identité, et toute session résiduelle est ignorée.
 */
export function optionalAuthForLink(req: Request, res: Response, next: NextFunction) {
  if ((req.body ?? {}).intent !== 'link') {
    return next()
  }
  return optionalAuth(req, res, next)
}
