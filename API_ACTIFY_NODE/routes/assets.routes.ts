import { Router } from 'express'
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware'
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
assetsRouter.post('/:id/tokenize/intent', requireAuth, tokenizeController.intent)
assetsRouter.post('/:id/tokenize/confirm', requireAuth, tokenizeController.confirm)
// TODO(auth2): gate behind TOTP once 2FA enrollment exists (Bearer token + Owner + TOTP per spec).
assetsRouter.delete('/:id', requireAuth, assetsController.remove)
// TODO(auth2): gate behind TOTP once 2FA enrollment exists (Bearer token + Owner + TOTP per spec).
assetsRouter.post('/:id/publish', requireAuth, assetsController.publish)
assetsRouter.post('/:id/unpublish', requireAuth, assetsController.unpublish)
