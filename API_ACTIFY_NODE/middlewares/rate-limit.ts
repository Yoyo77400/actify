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

// TOTP codes are 6 digits (1e6 space) with no server-side lockout otherwise —
// without this, /auth/verify-2fa and /auth/2fa/confirm are brute-forceable.
// Window matches the pending-2FA token's lifetime (utils/jwt PENDING_TOTP_TTL)
// so the cap roughly reads as "100 guesses per login attempt"; kept generous
// (100, not the ~15/20 used elsewhere) since a legitimate user fat-fingering
// their code a few times must never get locked out.
export const totpLimiter = limiter(5 * 60 * 1000, 100)
