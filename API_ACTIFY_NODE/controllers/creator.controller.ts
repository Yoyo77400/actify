import type { Request, Response } from 'express'
import * as creatorService from '../services/creator.service'
import { sendSuccess } from '../utils/http'

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function getStats(req: Request, res: Response) {
  sendSuccess(res, await creatorService.getCreatorStats(req.user!.id))
}

export async function getAssetStats(req: Request, res: Response) {
  sendSuccess(res, await creatorService.getCreatorAssetStats(req.user!.id, String(req.params.id)))
}

export async function getRevenue(req: Request, res: Response) {
  const query = req.query as Record<string, unknown>

  const result = await creatorService.getCreatorRevenue(req.user!.id, {
    period: queryString(query.period),
    from: queryString(query.from),
    to: queryString(query.to),
  })

  sendSuccess(res, result)
}
