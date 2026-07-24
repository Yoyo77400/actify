import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import * as consentsController from '../controllers/consents.controller'

export const consentsRouter = Router()

consentsRouter.use(requireAuth)

consentsRouter.get('/', consentsController.listMine)
consentsRouter.post('/', consentsController.upsert)
consentsRouter.delete('/:category', consentsController.revoke)
