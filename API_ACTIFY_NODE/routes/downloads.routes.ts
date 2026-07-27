import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import { onchainLimiter } from '../middlewares/rate-limit'
import * as downloadsController from '../controllers/downloads.controller'

export const downloadsRouter = Router()

// Rate-limited like the other XRPL-touching endpoints: entitlement resolution
// queries the ledger for on-chain NFToken ownership.
downloadsRouter.post('/:assetId/request', onchainLimiter, requireAuth, downloadsController.request)
// Public by design: the signed short-lived token is the proof of entitlement.
downloadsRouter.get('/token/:token', downloadsController.downloadByToken)
downloadsRouter.get('/history', requireAuth, downloadsController.history)
