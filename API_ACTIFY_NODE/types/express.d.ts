export interface AuthenticatedUser {
  id: string
  // true si le jeton a été délivré après validation 2FA (lu par requireTotp).
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
