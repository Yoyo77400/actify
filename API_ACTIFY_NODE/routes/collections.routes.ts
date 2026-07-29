import { Router } from 'express'
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware'
import * as collectionsController from '../controllers/collections.controller'
import * as uploadsController from '../controllers/uploads.controller'
import { uploadSingleImage } from '../services/storage'

export const collectionsRouter = Router()

// "/me" is declared before "/:slug" so the dynamic route doesn't swallow it.
collectionsRouter.get('/me', requireAuth, collectionsController.listMine)

collectionsRouter.get('/', collectionsController.list)
collectionsRouter.post('/', requireAuth, collectionsController.create)
// optionalAuth : le propriétaire voit ses brouillons, un visiteur non.
collectionsRouter.get('/:slug', optionalAuth, collectionsController.getBySlug)
collectionsRouter.get('/:slug/assets', optionalAuth, collectionsController.listAssets)
// Ownership is enforced in the service (owner_id), not by a role: a collection
// belongs to the creator who made it.
collectionsRouter.put('/:id', requireAuth, collectionsController.update)
// Couverture : upload direct, comme les images de profil (le champ `img` n'est
// qu'une clé de stockage, il n'accepte pas un fichier).
collectionsRouter.post(
  '/:id/image',
  requireAuth,
  uploadSingleImage('image'),
  uploadsController.uploadCollectionImage,
)
collectionsRouter.delete('/:id', requireAuth, collectionsController.remove)
