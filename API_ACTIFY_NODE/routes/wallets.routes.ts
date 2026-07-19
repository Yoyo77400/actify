import { Router } from 'express'
import { optionalAuth, requireAuth, requireTotp } from '../middlewares/auth.middleware'
import * as walletsController from '../controllers/wallets.controller'

export const walletsRouter = Router()

walletsRouter.post('/challenge', walletsController.challenge)
// optionalAuth: with a valid session this links a wallet, without one it's the login/signup itself.
walletsRouter.post('/verify', optionalAuth, walletsController.verify)

walletsRouter.get('/', requireAuth, walletsController.list)
walletsRouter.put('/:id', requireAuth, walletsController.update)
// Déliaison d'un wallet (action sensible) : Bearer + 2FA (requireTotp).
walletsRouter.delete('/:id', requireAuth, requireTotp, walletsController.remove)
