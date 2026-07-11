import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import * as creatorController from '../controllers/creator.controller'

export const creatorRouter = Router()

creatorRouter.get('/stats', requireAuth, requireRole('creator'), creatorController.getStats)
creatorRouter.get('/stats/revenue', requireAuth, requireRole('creator'), creatorController.getRevenue)
// Per-asset ownership is enforced in the service (404 pattern).
creatorRouter.get('/stats/assets/:id', requireAuth, requireRole('creator'), creatorController.getAssetStats)
