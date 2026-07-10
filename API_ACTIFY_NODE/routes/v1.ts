import { Router } from 'express'
import { prisma } from '../services/prisma'
import { usersRouter } from './users.routes'
import { walletsRouter } from './wallets.routes'
import { assetsRouter } from './assets.routes'

export const v1Router = Router()

// Liveness + DB readiness probe (used by the Docker healthcheck).
v1Router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', db: 'up' })
  } catch {
    res.status(503).json({ status: 'error', db: 'down' })
  }
})

v1Router.use('/users', usersRouter)
v1Router.use('/wallets', walletsRouter)
v1Router.use('/assets', assetsRouter)
