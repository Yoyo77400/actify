import type { Request, Response } from 'express'
import * as statsService from '../services/stats.service'
import { sendSuccess } from '../utils/http'

export async function marketplace(_req: Request, res: Response) {
  sendSuccess(res, await statsService.getMarketplaceStats())
}

export async function trending(_req: Request, res: Response) {
  sendSuccess(res, await statsService.getTrendingAssets())
}

export async function topCreators(_req: Request, res: Response) {
  sendSuccess(res, await statsService.getTopCreators())
}
