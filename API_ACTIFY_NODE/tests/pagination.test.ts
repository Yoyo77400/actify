import { describe, it, expect } from 'vitest'
import { parsePagination } from '../utils/pagination'

describe('pagination utils', () => {
  it('returns default pagination for empty query', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, skip: 0 })
  })

  it('parses valid page and limit', () => {
    expect(parsePagination({ page: '2', limit: '10' })).toEqual({ page: 2, limit: 10, skip: 10 })
  })

  it('caps limit at 100', () => {
    expect(parsePagination({ limit: '150' })).toEqual({ page: 1, limit: 100, skip: 0 })
  })

  it('handles negative or invalid page by defaulting to 1', () => {
    expect(parsePagination({ page: '-5' })).toEqual({ page: 1, limit: 20, skip: 0 })
    expect(parsePagination({ page: 'invalid' })).toEqual({ page: 1, limit: 20, skip: 0 })
  })

  it('caps negative limit at 1, and invalid limit at 20', () => {
    expect(parsePagination({ limit: '-10' })).toEqual({ page: 1, limit: 1, skip: 0 })
    expect(parsePagination({ limit: 'invalid' })).toEqual({ page: 1, limit: 20, skip: 0 })
  })
})
