import { Router } from 'express'
import { optionalAuth, requireAuth, requireTotp } from '../middlewares/auth.middleware'
import * as usersController from '../controllers/users.controller'
import * as uploadsController from '../controllers/uploads.controller'
import { uploadSingleImage } from '../services/storage'

export const usersRouter = Router()

// The artist directory: public, but viewer-aware (optionalAuth) so each card
// can say whether the caller already follows that creator.
usersRouter.get('/', optionalAuth, usersController.listCreators)

// Static "/me" routes are registered before "/:username" so they aren't
// swallowed by the dynamic param route.
usersRouter.get('/me', requireAuth, usersController.getMe)
usersRouter.put('/me', requireAuth, usersController.updateMe)
// Images de profil : upload direct (le champ *Cid de PUT /me n'accepte qu'une
// clé déjà stockée). Filtrées sur les MIME image, comme les miniatures.
usersRouter.post('/me/avatar', requireAuth, uploadSingleImage('avatar'), uploadsController.uploadAvatar)
usersRouter.post('/me/banner', requireAuth, uploadSingleImage('banner'), uploadsController.uploadBanner)
// Actions sensibles : 2FA requise.
usersRouter.delete('/me', requireAuth, requireTotp, usersController.deleteMe)
usersRouter.get('/me/data-export', requireAuth, requireTotp, usersController.exportMyData)

usersRouter.get('/:username', optionalAuth, usersController.getPublicProfile)
usersRouter.get('/:username/assets', usersController.listUserAssets)
usersRouter.get('/:username/reviews', usersController.listUserReviews)
