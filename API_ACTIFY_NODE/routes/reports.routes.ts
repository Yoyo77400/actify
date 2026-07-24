import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import * as reportsController from '../controllers/reports.controller'

export const reportsRouter = Router()

// Public: the reason list is shown in the report form before login is checked.
reportsRouter.get('/reasons', reportsController.listReasons)
reportsRouter.post('/', requireAuth, reportsController.create)
