import type { TwoFactorSetup, TwoFactorLoginResult } from '~/types/auth'

// Fin appels API 2FA (TOTP). Garde les pages minces : la logique d'affichage
// (QR, saisie du code) reste dans les composants, les appels réseau ici.
export function useTwoFactor() {
  const api = useApi()

  // Enrôlement A : génère le secret + QR pour l'utilisateur connecté.
  const setup = () => api.post<TwoFactorSetup>('/auth/2fa/setup')

  // Enrôlement B : valide le premier code et active la 2FA.
  const confirm = (code: string) => api.post<{ enabled: boolean }>('/auth/2fa/confirm', { code })

  // Second verrou du login : échange le pending token + code contre un jeton.
  // Public (auth:false) : l'utilisateur n'a pas encore de session.
  const verifyLogin = (pendingToken: string, code: string) =>
    api.post<TwoFactorLoginResult>('/auth/verify-2fa', { pendingToken, code }, { auth: false })

  return { setup, confirm, verifyLogin }
}
