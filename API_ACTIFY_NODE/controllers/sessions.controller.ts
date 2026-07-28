import type { Request, Response } from 'express'
import * as sessionsService from '../services/sessions.service'
import { sendSuccess } from '../utils/http'
import { clearAuthCookies } from '../utils/auth-cookies'

export async function list(req: Request, res: Response) {
  sendSuccess(res, await sessionsService.listUserSessions(req.user!.id, req.user!.sessionId))
}

/** Revokes the session behind the caller's own token. */
export async function logout(req: Request, res: Response) {
  const result = await sessionsService.revokeSession(req.user!.sessionId)
  clearAuthCookies(res)
  sendSuccess(res, result)
}

export async function revoke(req: Request, res: Response) {
  sendSuccess(res, await sessionsService.revokeUserSession(req.user!.id, String(req.params.id)))
}

/** "Sign out everywhere" — the answer to a device you no longer control. */
export async function revokeAll(req: Request, res: Response) {
  sendSuccess(res, await sessionsService.revokeAllUserSessions(req.user!.id))
}
