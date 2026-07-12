import type { Request, Response } from 'express'
import * as tokenizeService from '../services/tokenize.service'
import { sendSuccess } from '../utils/http'

export async function intent(req: Request, res: Response) {
  const result = await tokenizeService.buildMintIntent(req.user!.id, String(req.params.id))
  sendSuccess(res, result)
}

export async function confirm(req: Request, res: Response) {
  const { txHash } = req.body ?? {}
  const result = await tokenizeService.confirmMint(req.user!.id, String(req.params.id), txHash)
  sendSuccess(res, result, undefined, 201)
}
