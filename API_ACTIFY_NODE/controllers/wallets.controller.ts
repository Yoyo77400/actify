import type { Request, Response } from 'express'
import * as walletsService from '../services/wallets.service'
import { sendSuccess } from '../utils/http'

export async function challenge(req: Request, res: Response) {
  const { address, chain } = req.body ?? {}
  const result = await walletsService.createChallenge({ address, chain })
  sendSuccess(res, result)
}

export async function verify(req: Request, res: Response) {
  const { address, publicKey, signature, nonce, chain } = req.body ?? {}
  const result = await walletsService.verifyChallenge(
    { address, publicKey, signature, nonce, chain },
    req.user?.id ?? null,
  )
  sendSuccess(res, result)
}

export async function list(req: Request, res: Response) {
  const wallets = await walletsService.listWallets(req.user!.id)
  sendSuccess(res, wallets)
}

export async function update(req: Request, res: Response) {
  const { label, isPrimary } = req.body ?? {}
  const wallet = await walletsService.updateWallet(req.user!.id, String(req.params.id), { label, isPrimary })
  sendSuccess(res, wallet)
}

export async function remove(req: Request, res: Response) {
  const result = await walletsService.removeWallet(req.user!.id, String(req.params.id))
  sendSuccess(res, result)
}
