import { Router } from 'express'
import { optionalAuth, requireAuth, requireTotp } from '../middlewares/auth.middleware'
import { onchainLimiter } from '../middlewares/rate-limit'
import * as assetsController from '../controllers/assets.controller'
import * as tokenizeController from '../controllers/tokenize.controller'
import * as uploadsController from '../controllers/uploads.controller'
import { uploadSingle, uploadSingleImage } from '../services/storage'

export const assetsRouter = Router()

// Any authenticated user can publish their own assets — no creator role gate.
assetsRouter.post('/', requireAuth, assetsController.create)
assetsRouter.get('/', assetsController.list)
assetsRouter.get('/:idOrSlug', optionalAuth, assetsController.getByIdOrSlug)
assetsRouter.put('/:id', requireAuth, assetsController.update)
// Direct file upload (owner): the main downloadable file and the thumbnail.
assetsRouter.post('/:id/file', requireAuth, uploadSingle('file'), uploadsController.uploadFile)
assetsRouter.post('/:id/thumbnail', requireAuth, uploadSingleImage('thumbnail'), uploadsController.uploadThumbnail)
// Tokenization (owner): build the NFTokenMint the wallet signs, then record
// the verified on-chain mint. Registered before /:id/publish, which requires
// the asset to be tokenized first.
assetsRouter.post('/:id/tokenize/intent', onchainLimiter, requireAuth, tokenizeController.intent)
assetsRouter.post('/:id/tokenize/confirm', onchainLimiter, requireAuth, tokenizeController.confirm)
// Actions sensibles : 2FA requise.
assetsRouter.delete('/:id', requireAuth, requireTotp, assetsController.remove)
assetsRouter.post('/:id/publish', requireAuth, requireTotp, assetsController.publish)
assetsRouter.post('/:id/unpublish', requireAuth, assetsController.unpublish)
