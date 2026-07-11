import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/role.middleware'
import * as adminController from '../controllers/admin.controller'

export const adminRouter = Router()

// Every admin route requires an authenticated admin.
adminRouter.use(requireAuth, requireRole('admin'))

adminRouter.get('/assets', adminController.listAssets)
adminRouter.put('/assets/:id/status', adminController.updateAssetStatus)
adminRouter.delete('/assets/:id', adminController.removeAsset)
adminRouter.get('/users', adminController.listUsers)
adminRouter.get('/users/:id', adminController.getUser)
adminRouter.post('/users/:id/ban', adminController.banUser)
adminRouter.post('/users/:id/unban', adminController.unbanUser)
adminRouter.put('/users/:id/role', adminController.updateUserRole)
adminRouter.get('/orders', adminController.listOrders)
adminRouter.get('/stats', adminController.getStats)
