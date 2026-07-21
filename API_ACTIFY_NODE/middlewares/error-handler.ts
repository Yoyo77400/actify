import type { ErrorRequestHandler } from 'express'
import { MulterError } from 'multer'
import { AppError } from '../utils/http'

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    // On-chain verification failures (TX_*) and upstream faults are the
    // operational signals of this API — keep a server-side trace, the client
    // only ever sees the JSON envelope.
    if (err.status >= 500 || err.code.startsWith('TX_')) {
      console.error(`[${req.method} ${req.originalUrl}] ${err.status} ${err.code}: ${err.message}`)
    }
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
