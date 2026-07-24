import { Router } from 'express'
import { requireAuth, requireTotp } from '../middlewares/auth.middleware'
import * as usersController from '../controllers/users.controller'

export const usersRouter = Router()

// Static "/me" routes are registered before "/:username" so they aren't
// swallowed by the dynamic param route.
usersRouter.get('/me', requireAuth, usersController.getMe)
usersRouter.put('/me', requireAuth, usersController.updateMe)
// Actions sensibles : 2FA requise.
usersRouter.delete('/me', requireAuth, requireTotp, usersController.deleteMe)
usersRouter.get('/me/data-export', requireAuth, requireTotp, usersController.exportMyData)

usersRouter.get('/:username', usersController.getPublicProfile)
usersRouter.get('/:username/assets', usersController.listUserAssets)
usersRouter.get('/:username/reviews', usersController.listUserReviews)
