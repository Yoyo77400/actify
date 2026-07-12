import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import * as favoritesController from '../controllers/favorites.controller'

// Mounted at /assets, before assetsRouter.
export const assetFavoritesRouter = Router()

assetFavoritesRouter.post('/:id/favorite', requireAuth, favoritesController.add)
assetFavoritesRouter.delete('/:id/favorite', requireAuth, favoritesController.remove)

// Mounted at /users, BEFORE usersRouter — otherwise '/me/favorites' would be
// swallowed by its '/:username' route.
export const meFavoritesRouter = Router()

meFavoritesRouter.get('/me/favorites', requireAuth, favoritesController.listMine)
