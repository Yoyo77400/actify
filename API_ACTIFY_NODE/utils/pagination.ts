const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface Pagination {
  page: number
  limit: number
  skip: number
}

export function parsePagination(query: Record<string, unknown>): Pagination {
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1)
  const rawLimit = Number.parseInt(String(query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit))

  return { page, limit, skip: (page - 1) * limit }
}
