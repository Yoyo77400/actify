import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import * as ordersController from '../controllers/orders.controller'

export const ordersRouter = Router()

ordersRouter.post('/', requireAuth, ordersController.create)
ordersRouter.get('/', requireAuth, ordersController.list)
ordersRouter.get('/:id', requireAuth, ordersController.getById)
// TODO(auth2): gate behind TOTP once 2FA enrollment exists (Bearer token + TOTP per spec).
ordersRouter.post('/:id/confirm', requireAuth, ordersController.confirm)
ordersRouter.post('/:id/cancel', requireAuth, ordersController.cancel)
