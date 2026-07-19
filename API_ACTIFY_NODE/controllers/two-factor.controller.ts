import type { Request, Response } from 'express'
import * as twoFactorService from '../services/two-factor.service'
import { sendSuccess } from '../utils/http'

// Enrôlement 2FA — l'utilisateur est déjà authentifié (requireAuth).
export async function setup(req: Request, res: Response) {
  const result = await twoFactorService.setupTwoFactor(req.user!.id)
  sendSuccess(res, result)
}

export async function confirm(req: Request, res: Response) {
  const { code } = req.body ?? {}
  const result = await twoFactorService.confirmTwoFactor(req.user!.id, code)
  sendSuccess(res, result)
}
