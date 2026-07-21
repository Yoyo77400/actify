import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit'

// Per-IP limits with the in-memory store — enough for a single-instance API.
// Client IPs come from X-Forwarded-For via `trust proxy` (see app.ts); these
// limiters are abuse mitigation for expensive endpoints, not an auth boundary,
// hence validate.trustProxy is deliberately silenced.
function limiter(windowMs: number, limit: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Trop de requêtes, réessayez dans quelques instants', details: {} },
      })
    },
  })
}

// Challenge/verify hit the DB and the signature verifier on every call —
// the brute-force / spam target of the wallet login flow.
export const walletAuthLimiter = limiter(5 * 60 * 1000, 20)

// On-chain verification polls the XRPL RPC for up to ~20s per request — the
// most expensive endpoints of the API, spammable with bogus tx hashes. A
// legitimate mint or purchase needs 2-3 calls total.
export const onchainLimiter = limiter(60 * 1000, 15)
