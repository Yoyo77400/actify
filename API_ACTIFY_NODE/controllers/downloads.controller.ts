import type { Request, Response } from 'express'
import * as downloadsService from '../services/downloads.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

export async function request(req: Request, res: Response) {
  const result = await downloadsService.requestDownload(req.user!.id, String(req.params.assetId))
  sendSuccess(res, result)
}

export async function downloadByToken(req: Request, res: Response) {
  const url = downloadsService.resolveDownloadUrl(String(req.params.token))
  // Allowed exception to the sendSuccess envelope: the deliverable is a 302
  // redirect to the IPFS gateway, not JSON.
  res.redirect(url)
}

export async function history(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await downloadsService.listMyDownloads(req.user!.id, pagination)
  sendSuccess(res, items, meta)
}
