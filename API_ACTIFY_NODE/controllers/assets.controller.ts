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
    collectionId: body.collectionId,
    distributionMode: body.distributionMode,
    maxDownloads: body.maxDownloads,
    isFree: body.isFree,
    basePrice: body.basePrice,
    currency: body.currency,
    royaltyBps: body.royaltyBps,
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

/**
 * XLS-24 token metadata, served RAW — no {success, data} envelope. This
 * document is what the NFT's on-chain URI resolves to: a wallet parses the
 * body as-is, so wrapping it would hide name/description/image one level down
 * and defeat the whole point.
 */
export async function metadata(req: Request, res: Response) {
  const doc = await assetsService.getAssetMetadata(String(req.params.id))

  // Read cross-origin by wallets and ledger explorers, which have no Actify
  // session and no shared origin. helmet's default same-origin CORP would
  // otherwise make this document unfetchable for exactly its intended callers.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  // Public, rarely-changing document polled by third parties we don't control.
  res.setHeader('Cache-Control', 'public, max-age=300')

  res.json(doc)
}

export async function update(req: Request, res: Response) {
  const body = req.body ?? {}
  const asset = await assetsService.updateAsset(req.user!.id, String(req.params.id), {
    title: body.title,
    description: body.description,
    shortDescription: body.shortDescription,
    tags: body.tags,
    categoryIds: body.categoryIds,
    collectionId: body.collectionId,
    distributionMode: body.distributionMode,
    maxDownloads: body.maxDownloads,
    isFree: body.isFree,
    basePrice: body.basePrice,
    currency: body.currency,
    royaltyBps: body.royaltyBps,
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
