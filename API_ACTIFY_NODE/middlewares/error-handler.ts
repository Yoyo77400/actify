import type { ErrorRequestHandler } from 'express'
import { AppError } from '../utils/http'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details ?? {} },
    })
    return
  }

  console.error(err)
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error', details: {} },
  })
}
