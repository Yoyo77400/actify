import type { Request, Response } from 'express'
import * as categoriesService from '../services/categories.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

export async function list(_req: Request, res: Response) {
  const categories = await categoriesService.listCategories()
  sendSuccess(res, categories)
}

export async function getBySlug(req: Request, res: Response) {
  const category = await categoriesService.getCategoryBySlug(String(req.params.slug))
  sendSuccess(res, category)
}

export async function listAssets(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await categoriesService.listCategoryAssets(String(req.params.slug), pagination)
  sendSuccess(res, items, meta)
}

export async function create(req: Request, res: Response) {
  const body = req.body ?? {}
  const category = await categoriesService.createCategory({ name: body.name })
  sendSuccess(res, category, undefined, 201)
}

export async function update(req: Request, res: Response) {
  const body = req.body ?? {}
  const category = await categoriesService.updateCategory(String(req.params.id), { name: body.name })
  sendSuccess(res, category)
}

export async function remove(req: Request, res: Response) {
  const result = await categoriesService.removeCategory(String(req.params.id))
  sendSuccess(res, result)
}
