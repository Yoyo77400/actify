import type { TwoFactorSetup, TwoFactorLoginResult } from '~/types/auth'

// Appels API 2FA (TOTP) regroupés pour garder les pages minces.
export function useTwoFactor() {
  const api = useApi()

  const setup = () => api.post<TwoFactorSetup>('/auth/2fa/setup')

  const confirm = (code: string) => api.post<{ enabled: boolean }>('/auth/2fa/confirm', { code })

  // Public (auth:false) : l'utilisateur n'a pas encore de session.
  const verifyLogin = (pendingToken: string, code: string) =>
    api.post<TwoFactorLoginResult>('/auth/verify-2fa', { pendingToken, code }, { auth: false })

  return { setup, confirm, verifyLogin }
}
