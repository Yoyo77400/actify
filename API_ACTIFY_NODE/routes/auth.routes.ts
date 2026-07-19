import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import * as authController from '../controllers/auth.controller'
import * as twoFactorController from '../controllers/two-factor.controller'

export const authRouter = Router()

authRouter.post('/refresh', authController.refresh)

// Enrôlement 2FA (TOTP) : setup génère le QR, confirm valide le premier code.
authRouter.post('/2fa/setup', requireAuth, twoFactorController.setup)
authRouter.post('/2fa/confirm', requireAuth, twoFactorController.confirm)
