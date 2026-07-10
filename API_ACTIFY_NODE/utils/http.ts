import type { Response } from 'express'

export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

interface Meta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function sendSuccess<T>(res: Response, data: T, meta?: Meta, status = 200) {
  res.status(status).json(meta ? { success: true, data, meta } : { success: true, data })
}

export function buildMeta(page: number, limit: number, total: number): Meta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
}
