import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import { totpLimiter } from '../middlewares/rate-limit'
import * as authController from '../controllers/auth.controller'
import * as twoFactorController from '../controllers/two-factor.controller'

export const authRouter = Router()

authRouter.post('/refresh', authController.refresh)

// Enrôlement 2FA (TOTP) : setup génère le QR, confirm valide le premier code.
// confirm et verify-2fa vérifient un code à 6 chiffres : rate-limités pour
// empêcher le brute-force (cf. totpLimiter).
authRouter.post('/2fa/setup', requireAuth, twoFactorController.setup)
authRouter.post('/2fa/confirm', totpLimiter, requireAuth, twoFactorController.confirm)
// Second verrou du login (public) : échange pending token + code TOTP → jeton.
authRouter.post('/verify-2fa', totpLimiter, twoFactorController.verifyLogin)
