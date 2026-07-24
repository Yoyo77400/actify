import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import * as notificationsController from '../controllers/notifications.controller'

export const notificationsRouter = Router()

notificationsRouter.use(requireAuth)

notificationsRouter.get('/', notificationsController.listMine)
notificationsRouter.get('/unread-count', notificationsController.unreadCount)
notificationsRouter.put('/read-all', notificationsController.markAllRead)
notificationsRouter.put('/:id/read', notificationsController.markRead)
notificationsRouter.delete('/:id', notificationsController.remove)
