import type { ErrorRequestHandler } from 'express'
import { MulterError } from 'multer'
import { AppError } from '../utils/http'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details ?? {} },
    })
    return
  }

  // Multer rejects an oversized/invalid upload before the controller runs.
  if (err instanceof MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE'
    res.status(tooLarge ? 413 : 400).json({
      success: false,
      error: {
        code: tooLarge ? 'FILE_TOO_LARGE' : 'VALIDATION_ERROR',
        message: tooLarge ? 'Le fichier dépasse la taille maximale (50 Mo)' : 'Upload invalide',
        details: {},
      },
    })
    return
  }

  console.error(err)
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error', details: {} },
  })
}
