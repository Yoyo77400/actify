import type { Request, Response } from 'express'
import * as authService from '../services/auth.service'
import { sendSuccess } from '../utils/http'
import { readRefreshToken, setAuthCookies } from '../utils/auth-cookies'

export async function refresh(req: Request, res: Response) {
  // Cookie d'abord : le navigateur ne connaît plus ses jetons, il ne peut donc
  // pas les envoyer dans le corps. Le corps reste accepté pour les clients
  // non-navigateur (scripts, tests d'intégration).
  const refreshToken = readRefreshToken(req) ?? (req.body ?? {}).refreshToken
  const result = await authService.refreshSession(refreshToken)
  setAuthCookies(res, result)
  sendSuccess(res, result)
}
