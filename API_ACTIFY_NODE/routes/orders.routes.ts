import { Router } from 'express'
import { requireAuth, requireTotp } from '../middlewares/auth.middleware'
import * as ordersController from '../controllers/orders.controller'

export const ordersRouter = Router()

ordersRouter.post('/', requireAuth, ordersController.create)
ordersRouter.get('/', requireAuth, ordersController.list)
ordersRouter.get('/pending/:assetId', requireAuth, ordersController.getPendingForAsset)
ordersRouter.get('/:id', requireAuth, ordersController.getById)
// Action sensible : 2FA requise.
ordersRouter.post('/:id/confirm', requireAuth, requireTotp, ordersController.confirm)
ordersRouter.post('/:id/cancel', requireAuth, ordersController.cancel)
