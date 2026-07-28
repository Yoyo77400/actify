import type { Request, Response } from 'express'
import { REFRESH_TOKEN_TTL_MS } from './jwt'

export const ACCESS_COOKIE = 'actify_token'
export const REFRESH_COOKIE = 'actify_refresh'

// L'access token vit 15 min, mais son cookie suit la session : le front n'a pas
// à le rafraîchir avant expiration, /auth/refresh s'en charge sur un 401.
const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  // Dev tourne sur http://localhost, où un cookie Secure serait ignoré.
  secure: process.env.NODE_ENV === 'production',
}

/**
 * Pose les jetons en cookies httpOnly.
 *
 * httpOnly est tout l'intérêt : auparavant le front écrivait ces cookies en
 * JavaScript, donc la moindre XSS suffisait à voler la session. Le navigateur
 * les renvoie tout seul (même origine via le proxy Nitro), et `sameSite: lax`
 * les retient sur les requêtes cross-site, ce qui couvre le CSRF.
 */
export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...COOKIE_BASE, maxAge: REFRESH_TOKEN_TTL_MS })
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, { ...COOKIE_BASE, maxAge: REFRESH_TOKEN_TTL_MS })
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, COOKIE_BASE)
  res.clearCookie(REFRESH_COOKIE, COOKIE_BASE)
}

/** Cookie d'abord (navigateur), en-tête Bearer ensuite (clients non-navigateur). */
export function readAccessToken(req: Request): string | null {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE]
  if (fromCookie) return fromCookie
  const header = req.header('authorization')
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

export function readRefreshToken(req: Request): string | null {
  return (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE] ?? null
}
