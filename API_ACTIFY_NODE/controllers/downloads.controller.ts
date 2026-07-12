import type { Request, Response } from 'express'
import * as downloadsService from '../services/downloads.service'
import { resolveStoredPath } from '../services/storage'
import { AppError, sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

export async function request(req: Request, res: Response) {
  const result = await downloadsService.requestDownload(req.user!.id, String(req.params.assetId))
  sendSuccess(res, result)
}

export async function downloadByToken(req: Request, res: Response) {
  const { key, downloadName } = await downloadsService.resolveDownloadFile(String(req.params.token))
  const path = resolveStoredPath(key)
  if (!path) {
    throw new AppError(404, 'NOT_FOUND', 'Fichier introuvable')
  }
  // Allowed exception to the sendSuccess envelope: the deliverable is the file
  // itself, streamed as an attachment.
  res.download(path, downloadName)
}

export async function history(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await downloadsService.listMyDownloads(req.user!.id, pagination)
  sendSuccess(res, items, meta)
}
