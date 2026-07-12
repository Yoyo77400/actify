import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import * as categoriesController from '../controllers/categories.controller'

export const categoriesRouter = Router()

categoriesRouter.get('/', categoriesController.list)
categoriesRouter.post('/', requireAuth, requireRole('admin'), categoriesController.create)
categoriesRouter.get('/:slug', categoriesController.getBySlug)
categoriesRouter.get('/:slug/assets', categoriesController.listAssets)
categoriesRouter.put('/:id', requireAuth, requireRole('admin'), categoriesController.update)
categoriesRouter.delete('/:id', requireAuth, requireRole('admin'), categoriesController.remove)
