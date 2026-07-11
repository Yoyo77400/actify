import type { Request, Response } from 'express'
import * as searchService from '../services/search.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function search(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const query = req.query as Record<string, unknown>

  const { results, meta } = await searchService.search(
    { q: queryString(query.q), type: queryString(query.type) },
    pagination,
  )

  sendSuccess(res, results, meta)
}

export async function suggestions(req: Request, res: Response) {
  const query = req.query as Record<string, unknown>
  const result = await searchService.getSuggestions(queryString(query.q))
  sendSuccess(res, result)
}
