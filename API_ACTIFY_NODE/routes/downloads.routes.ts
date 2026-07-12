import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import * as downloadsController from '../controllers/downloads.controller'

export const downloadsRouter = Router()

downloadsRouter.post('/:assetId/request', requireAuth, downloadsController.request)
// Public by design: the signed short-lived token is the proof of entitlement.
downloadsRouter.get('/token/:token', downloadsController.downloadByToken)
downloadsRouter.get('/history', requireAuth, downloadsController.history)
