import { Router } from 'express'
import { prisma } from '../services/prisma'
import { authRouter } from './auth.routes'
import { usersRouter } from './users.routes'
import { walletsRouter } from './wallets.routes'
import { assetsRouter } from './assets.routes'
import { categoriesRouter } from './categories.routes'
import { reviewsRouter, assetReviewsRouter } from './reviews.routes'
import { assetFavoritesRouter, meFavoritesRouter } from './favorites.routes'
import { ordersRouter } from './orders.routes'
import { downloadsRouter } from './downloads.routes'
import { searchRouter } from './search.routes'
import { statsRouter } from './stats.routes'
import { creatorRouter } from './creator.routes'
import { adminRouter } from './admin.routes'

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

v1Router.use('/auth', authRouter)

// Asset-scoped sub-resources are mounted on /assets BEFORE assetsRouter:
// its catch-all GET '/:idOrSlug' would swallow '/:id/reviews' otherwise.
v1Router.use('/assets', assetReviewsRouter)
v1Router.use('/assets', assetFavoritesRouter)
v1Router.use('/assets', assetsRouter)

// Same trick: '/me/favorites' must win over usersRouter's GET '/:username'.
v1Router.use('/users', meFavoritesRouter)
v1Router.use('/users', usersRouter)

v1Router.use('/wallets', walletsRouter)
v1Router.use('/categories', categoriesRouter)
v1Router.use('/reviews', reviewsRouter)
v1Router.use('/orders', ordersRouter)
v1Router.use('/downloads', downloadsRouter)
v1Router.use('/search', searchRouter)
v1Router.use('/stats', statsRouter)
v1Router.use('/creator', creatorRouter)
v1Router.use('/admin', adminRouter)
