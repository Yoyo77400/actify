import type { Request, Response } from 'express'
import * as consentsService from '../services/consents.service'
import { sendSuccess } from '../utils/http'

export async function listMine(req: Request, res: Response) {
  sendSuccess(res, await consentsService.listMyConsents(req.user!.id))
}

export async function upsert(req: Request, res: Response) {
  const body = req.body ?? {}
  const consent = await consentsService.upsertConsent(req.user!.id, {
    category: body.category,
    isGranted: body.isGranted,
    policyVersion: body.policyVersion,
  })
  sendSuccess(res, consent, undefined, 201)
}

export async function revoke(req: Request, res: Response) {
  sendSuccess(res, await consentsService.revokeConsent(req.user!.id, String(req.params.category)))
}
