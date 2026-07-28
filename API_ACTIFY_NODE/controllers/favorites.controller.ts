import type { Request, Response } from 'express'
import * as favoritesService from '../services/favorites.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function add(req: Request, res: Response) {
  const result = await favoritesService.addFavorite(req.user!.id, String(req.params.id))
  sendSuccess(res, result)
}

export async function remove(req: Request, res: Response) {
  const result = await favoritesService.removeFavorite(req.user!.id, String(req.params.id))
  sendSuccess(res, result)
}

export async function listMine(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const query = req.query as Record<string, unknown>

  const { items, meta } = await favoritesService.listMyFavorites(
    req.user!.id,
    {
      q: queryString(query.q),
      category: queryString(query.category),
      tags: queryString(query.tags),
      isFree: query.isFree !== undefined ? query.isFree === 'true' : undefined,
      mode: queryString(query.mode),
      minPrice: query.minPrice !== undefined ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice !== undefined ? Number(query.maxPrice) : undefined,
      sort: queryString(query.sort),
      order: queryString(query.order) === 'asc' ? 'asc' : 'desc',
    },
    pagination,
  )

  sendSuccess(res, items, meta)
}
