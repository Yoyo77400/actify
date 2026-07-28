import type { Request, Response } from 'express'
import * as walletsService from '../services/wallets.service'
import { sendSuccess } from '../utils/http'
import { sessionContext } from '../utils/request-context'
import { setAuthCookies } from '../utils/auth-cookies'

export async function challenge(req: Request, res: Response) {
  const { address, chain } = req.body ?? {}
  const result = await walletsService.createChallenge({ address, chain })
  sendSuccess(res, result)
}

export async function verify(req: Request, res: Response) {
  const { address, publicKey, signature, nonce, chain, intent } = req.body ?? {}
  // L'intention est explicite, elle ne se déduit plus de la présence d'une
  // session : depuis que les jetons sont en cookies httpOnly, le navigateur les
  // joint automatiquement, et une session résiduelle transformerait une
  // tentative de CONNEXION en liaison silencieuse du wallet sur l'ancien compte.
  const linking = intent === 'link'
  const result = await walletsService.verifyChallenge(
    { address, publicKey, signature, nonce, chain },
    linking ? (req.user?.id ?? null) : null,
    sessionContext(req),
  )
  // Session ouverte : les jetons partent en cookies httpOnly, hors de portée
  // du JavaScript de la page.
  if (result.mode === 'authenticated') {
    setAuthCookies(res, result)
  }
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
