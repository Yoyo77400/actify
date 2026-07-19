import { Router } from 'express'
import { requireAuth, requireTotp } from '../middlewares/auth.middleware'
import * as ordersController from '../controllers/orders.controller'

export const ordersRouter = Router()

ordersRouter.post('/', requireAuth, ordersController.create)
ordersRouter.get('/', requireAuth, ordersController.list)
ordersRouter.get('/:id', requireAuth, ordersController.getById)
// Confirmation de paiement (action sensible) : Bearer + 2FA (requireTotp).
ordersRouter.post('/:id/confirm', requireAuth, requireTotp, ordersController.confirm)
ordersRouter.post('/:id/cancel', requireAuth, ordersController.cancel)
