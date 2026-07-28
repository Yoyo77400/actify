import { AppError } from './http'

/**
 * Builds an absolute, publicly reachable URL for an API path.
 *
 * The API container is never exposed directly (docker-compose.prod.yml puts it
 * on an `internal: true` network with no published port): the public origin is
 * the frontend's domain, whose Nitro proxy forwards `/api/**` here. So
 * PUBLIC_BASE_URL holds that frontend origin — e.g. https://actify.yohan-georgelin.fr.
 * It must be a bare origin (scheme/host/port): the proxy serves /api at the
 * root, so a path would be meaningless, and accepting one silently would be
 * worse than refusing it.
 *
 * Deliberately has no fallback value. The NFT metadata URI is written to the
 * XRP Ledger at mint time and is immutable afterwards: guessing an origin
 * would mint a permanently unresolvable token, so a missing or malformed
 * value fails the request instead.
 */
export function publicUrl(path: string): string {
  const raw = process.env.PUBLIC_BASE_URL?.trim()
  if (!raw) {
    throw new AppError(500, 'PUBLIC_URL_NOT_CONFIGURED', "L'URL publique de l'instance n'est pas configurée")
  }

  let origin: string
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('unsupported protocol')
    }
    // `.origin` would silently drop a path, query or fragment — quietly minting
    // URIs missing a prefix the operator believed was there. This module exists
    // to make that class of mistake loud, so reject instead of truncating.
    if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
      throw new Error('origin expected, got a full URL')
    }
    origin = url.origin
  } catch {
    throw new AppError(500, 'PUBLIC_URL_NOT_CONFIGURED', "L'URL publique de l'instance est invalide")
  }

  return `${origin}${path}`
}
