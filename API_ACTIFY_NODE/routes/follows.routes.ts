import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import * as followsController from '../controllers/follows.controller'
import * as usersController from '../controllers/users.controller'

// Mounted at /users, alongside usersRouter.
export const userFollowRouter = Router()

userFollowRouter.post('/:username/follow', requireAuth, followsController.follow)
userFollowRouter.delete('/:username/follow', requireAuth, followsController.unfollow)

// Mounted at /users, BEFORE usersRouter — otherwise '/me/following*' would be
// swallowed by its '/:username' route (same trick as meFavoritesRouter).
export const meFollowingRouter = Router()

// "Mes abonnements": the artists this user follows.
meFollowingRouter.get('/me/following', requireAuth, usersController.listFollowing)
// Latest assets from those same artists.
meFollowingRouter.get('/me/following/feed', requireAuth, followsController.listFeed)
