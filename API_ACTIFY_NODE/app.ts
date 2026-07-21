import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { v1Router } from './routes/v1'
import { errorHandler } from './middlewares/error-handler'

export function createApp() {
  const app = express()

  // Behind the VPS reverse-proxy and the Nitro /api proxy: read the client IP
  // from the leftmost X-Forwarded-For entry so per-IP rate limits don't lump
  // every visitor behind the proxies' address. Spoofable by a crafted header,
  // which is acceptable for abuse mitigation (never used as an auth boundary).
  app.set('trust proxy', true)

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
