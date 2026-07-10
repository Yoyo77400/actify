import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import * as usersController from '../controllers/users.controller'

export const usersRouter = Router()

// Static "/me" routes are registered before "/:username" so they aren't
// swallowed by the dynamic param route.
usersRouter.get('/me', requireAuth, usersController.getMe)
usersRouter.put('/me', requireAuth, usersController.updateMe)
// TODO(auth2): gate behind TOTP once 2FA enrollment exists (Bearer token + TOTP per spec).
usersRouter.delete('/me', requireAuth, usersController.deleteMe)
usersRouter.get('/me/data-export', requireAuth, usersController.exportMyData)

usersRouter.get('/:username', usersController.getPublicProfile)
usersRouter.get('/:username/assets', usersController.listUserAssets)
usersRouter.get('/:username/reviews', usersController.listUserReviews)
