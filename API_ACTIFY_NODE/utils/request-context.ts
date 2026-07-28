import type { Request } from 'express'
import type { SessionContext } from '../services/sessions.service'

/**
 * Device fingerprint stored on a session, purely so the user can recognise
 * their own devices in the sessions list. Both values are client-controlled and
 * never used for authorization. `req.ip` honours `trust proxy` (see app.ts).
 */
export function sessionContext(req: Request): SessionContext {
  return { userAgent: req.header('user-agent') ?? null, ip: req.ip ?? null }
}
