import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import * as creatorController from '../controllers/creator.controller'

export const creatorRouter = Router()

// Anyone logged in can publish assets, so these "my creations" views are just
// auth-gated; each service scopes to the caller's own listings.
creatorRouter.get('/listings', requireAuth, creatorController.getListings)
creatorRouter.get('/stats', requireAuth, creatorController.getStats)
creatorRouter.get('/stats/revenue', requireAuth, creatorController.getRevenue)
// Per-asset ownership is enforced in the service (404 pattern).
creatorRouter.get('/stats/assets/:id', requireAuth, creatorController.getAssetStats)
