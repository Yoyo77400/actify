export interface AuthenticatedUser {
  id: string
  // true quand le jeton d'accès a été délivré après validation du 2FA (TOTP).
  // Lu par requireTotp pour garder les actions sensibles.
  mfa: boolean
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

export {}
