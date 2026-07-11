import { Router } from 'express'
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import * as assetsController from '../controllers/assets.controller'

export const assetsRouter = Router()

assetsRouter.post('/', requireAuth, requireRole('creator'), assetsController.create)
assetsRouter.get('/', assetsController.list)
assetsRouter.get('/:idOrSlug', optionalAuth, assetsController.getByIdOrSlug)
assetsRouter.put('/:id', requireAuth, assetsController.update)
// TODO(auth2): gate behind TOTP once 2FA enrollment exists (Bearer token + Owner + TOTP per spec).
assetsRouter.delete('/:id', requireAuth, assetsController.remove)
// TODO(auth2): gate behind TOTP once 2FA enrollment exists (Bearer token + Owner + TOTP per spec).
assetsRouter.post('/:id/publish', requireAuth, assetsController.publish)
assetsRouter.post('/:id/unpublish', requireAuth, assetsController.unpublish)
