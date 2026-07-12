import type { Request, Response } from 'express'
import * as authService from '../services/auth.service'
import { sendSuccess } from '../utils/http'

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body ?? {}
  const result = await authService.refreshSession(refreshToken)
  sendSuccess(res, result)
}
