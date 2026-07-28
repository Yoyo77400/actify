import { AppError } from './http'

export interface DateRangeParams {
  from?: string
  to?: string
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function parseDate(value: string | undefined, field: string, endOfDay: boolean): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} doit être une date valide`)
  }
  // A bare "YYYY-MM-DD" (e.g. from an <input type="date">) parses to UTC
  // midnight. For the upper bound, push it to the end of that day so
  // "to: 2026-07-28" still includes rows created later that same day.
  if (endOfDay && DATE_ONLY.test(value)) {
    date.setUTCHours(23, 59, 59, 999)
  }
  return date
}

/** Prisma gte/lte where-clause from ISO date strings, or undefined if neither is set. */
export function buildDateRangeWhere(params: DateRangeParams): { gte?: Date; lte?: Date } | undefined {
  const gte = parseDate(params.from, 'from', false)
  const lte = parseDate(params.to, 'to', true)
  if (!gte && !lte) return undefined
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) }
}
