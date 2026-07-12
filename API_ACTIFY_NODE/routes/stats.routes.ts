import { Router } from 'express'
import * as statsController from '../controllers/stats.controller'

export const statsRouter = Router()

statsRouter.get('/marketplace', statsController.marketplace)
statsRouter.get('/trending', statsController.trending)
statsRouter.get('/top-creators', statsController.topCreators)
