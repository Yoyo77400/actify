import type { Request, Response } from 'express'
import * as assetsService from '../services/assets.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function create(req: Request, res: Response) {
  const body = req.body ?? {}
  const asset = await assetsService.createAsset(req.user!.id, {
    title: body.title,
    description: body.description,
    shortDescription: body.shortDescription,
    tags: body.tags,
    categoryIds: body.categoryIds,
    distributionMode: body.distributionMode,
    maxDownloads: body.maxDownloads,
    isFree: body.isFree,
    basePrice: body.basePrice,
    currency: body.currency,
    royaltyBps: body.royaltyBps,
    fileIpfsCid: body.fileIpfsCid,
    thumbnailCid: body.thumbnailCid,
  })
  sendSuccess(res, asset, undefined, 201)
}

export async function list(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const query = req.query as Record<string, unknown>

  const { items, meta } = await assetsService.listAssets(
    {
      q: queryString(query.q),
      category: queryString(query.category),
      tags: queryString(query.tags),
      isFree: query.isFree !== undefined ? query.isFree === 'true' : undefined,
      mode: queryString(query.mode),
      minPrice: query.minPrice !== undefined ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice !== undefined ? Number(query.maxPrice) : undefined,
      creator: queryString(query.creator),
      sort: queryString(query.sort),
      order: queryString(query.order) === 'asc' ? 'asc' : 'desc',
    },
    pagination,
  )

  sendSuccess(res, items, meta)
}

export async function getByIdOrSlug(req: Request, res: Response) {
  const asset = await assetsService.getAssetByIdOrSlug(String(req.params.idOrSlug), req.user?.id ?? null)
  sendSuccess(res, asset)
}

export async function update(req: Request, res: Response) {
  const body = req.body ?? {}
  const asset = await assetsService.updateAsset(req.user!.id, String(req.params.id), {
    title: body.title,
    description: body.description,
    shortDescription: body.shortDescription,
    tags: body.tags,
    categoryIds: body.categoryIds,
    distributionMode: body.distributionMode,
    maxDownloads: body.maxDownloads,
    isFree: body.isFree,
    basePrice: body.basePrice,
    currency: body.currency,
    royaltyBps: body.royaltyBps,
    fileIpfsCid: body.fileIpfsCid,
    thumbnailCid: body.thumbnailCid,
  })
  sendSuccess(res, asset)
}

export async function remove(req: Request, res: Response) {
  const result = await assetsService.softDeleteAsset(req.user!.id, String(req.params.id))
  sendSuccess(res, result)
}

export async function publish(req: Request, res: Response) {
  const asset = await assetsService.publishAsset(req.user!.id, String(req.params.id))
  sendSuccess(res, asset)
}

export async function unpublish(req: Request, res: Response) {
  const asset = await assetsService.unpublishAsset(req.user!.id, String(req.params.id))
  sendSuccess(res, asset)
}
