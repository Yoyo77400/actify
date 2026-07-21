import { Router } from 'express'
import { optionalAuth, requireAuth, requireTotp } from '../middlewares/auth.middleware'
import { walletAuthLimiter } from '../middlewares/rate-limit'
import * as walletsController from '../controllers/wallets.controller'

export const walletsRouter = Router()

walletsRouter.post('/challenge', walletAuthLimiter, walletsController.challenge)
// optionalAuth: with a valid session this links a wallet, without one it's the login/signup itself.
walletsRouter.post('/verify', walletAuthLimiter, optionalAuth, walletsController.verify)

walletsRouter.get('/', requireAuth, walletsController.list)
walletsRouter.put('/:id', requireAuth, walletsController.update)
// Action sensible : 2FA requise.
walletsRouter.delete('/:id', requireAuth, requireTotp, walletsController.remove)
