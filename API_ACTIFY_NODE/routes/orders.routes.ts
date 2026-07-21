import { Router } from 'express'
import { requireAuth, requireTotp } from '../middlewares/auth.middleware'
import { onchainLimiter } from '../middlewares/rate-limit'
import * as ordersController from '../controllers/orders.controller'

export const ordersRouter = Router()

ordersRouter.post('/', requireAuth, ordersController.create)
ordersRouter.get('/', requireAuth, ordersController.list)
ordersRouter.get('/pending/:assetId', requireAuth, ordersController.getPendingForAsset)
ordersRouter.get('/:id', requireAuth, ordersController.getById)
// Action sensible : 2FA requise. Limitée : la vérification on-chain coûte
// jusqu'à ~20s de poll RPC par appel.
ordersRouter.post('/:id/confirm', onchainLimiter, requireAuth, requireTotp, ordersController.confirm)
ordersRouter.post('/:id/cancel', requireAuth, ordersController.cancel)
