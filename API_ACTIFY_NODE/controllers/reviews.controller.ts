import type { Request, Response } from 'express'
import * as reviewsService from '../services/reviews.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function create(req: Request, res: Response) {
  const body = req.body ?? {}
  const review = await reviewsService.createReview(req.user!.id, {
    assetId: body.assetId,
    rating: body.rating,
    comment: body.comment,
  })
  sendSuccess(res, review, undefined, 201)
}

export async function update(req: Request, res: Response) {
  const body = req.body ?? {}
  const review = await reviewsService.updateReview(req.user!.id, String(req.params.id), {
    rating: body.rating,
    comment: body.comment,
  })
  sendSuccess(res, review)
}

export async function remove(req: Request, res: Response) {
  const result = await reviewsService.deleteReview(req.user!.id, String(req.params.id))
  sendSuccess(res, result)
}

export async function listByAsset(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const query = req.query as Record<string, unknown>

  const { items, meta } = await reviewsService.listAssetReviews(
    String(req.params.id),
    {
      rating: query.rating !== undefined ? Number(query.rating) : undefined,
      sort: queryString(query.sort),
      order: queryString(query.order) === 'asc' ? 'asc' : 'desc',
    },
    pagination,
  )

  sendSuccess(res, items, meta)
}
