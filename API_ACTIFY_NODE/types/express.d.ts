export interface AuthenticatedUser {
  id: string
  // true si le jeton a été délivré après validation 2FA (lu par requireTotp).
  mfa: boolean
  // true si le compte a activé la 2FA — requireTotp n'exige mfa que dans ce cas.
  twoFactorEnabled: boolean
  // Session serveur derrière ce jeton : /auth/logout révoque celle-ci, et
  // GET /auth/sessions la marque comme « appareil courant ».
  sessionId: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

export {}
