import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { v1Router } from './routes/v1'
import { errorHandler } from './middlewares/error-handler'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors())
  app.use(express.json())

  app.use('/api/v1', v1Router)

  // Unknown route → JSON 404 (API contract, not HTML).
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not Found', details: {} } })
  })

  app.use(errorHandler)

  return app
}
