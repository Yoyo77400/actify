import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import * as reviewsController from '../controllers/reviews.controller'

export const reviewsRouter = Router()

reviewsRouter.post('/', requireAuth, reviewsController.create)
reviewsRouter.put('/:id', requireAuth, reviewsController.update)
reviewsRouter.delete('/:id', requireAuth, reviewsController.remove)

// Mounted at /assets BEFORE assetsRouter so GET /assets/:id/reviews is matched
// here and never falls through to the assets router's GET /:idOrSlug.
export const assetReviewsRouter = Router()

assetReviewsRouter.get('/:id/reviews', reviewsController.listByAsset)
