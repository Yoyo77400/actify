import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import * as collectionsController from '../controllers/collections.controller'

export const collectionsRouter = Router()

// "/me" is declared before "/:slug" so the dynamic route doesn't swallow it.
collectionsRouter.get('/me', requireAuth, collectionsController.listMine)

collectionsRouter.get('/', collectionsController.list)
collectionsRouter.post('/', requireAuth, collectionsController.create)
collectionsRouter.get('/:slug', collectionsController.getBySlug)
collectionsRouter.get('/:slug/assets', collectionsController.listAssets)
// Ownership is enforced in the service (owner_id), not by a role: a collection
// belongs to the creator who made it.
collectionsRouter.put('/:id', requireAuth, collectionsController.update)
collectionsRouter.delete('/:id', requireAuth, collectionsController.remove)
