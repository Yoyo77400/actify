import type { Request, Response } from 'express'
import * as favoritesService from '../services/favorites.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

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
  const { items, meta } = await favoritesService.listMyFavorites(req.user!.id, pagination)
  sendSuccess(res, items, meta)
}
