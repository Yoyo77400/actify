import { WalletRejectedError, getWalletAdapter, type WalletId } from '~/lib/wallets'
import type { WalletChallenge, WalletVerifyResult } from '~/types/auth'

const CHAIN = 'xrpl'

export function useWalletAuth() {
  const store = useAuthStore()
  const api = useApi()
  const { fetchMe } = useAuth()

  const pending = ref<WalletId | null>(null)
  const error = ref<string | null>(null)

  async function signChallenge(id: WalletId): Promise<WalletVerifyResult> {
    const adapter = await getWalletAdapter(id)
    const { address, publicKey } = await adapter.connect()
    const challenge = await api.post<WalletChallenge>('/wallets/challenge', { address, chain: CHAIN })
    const signature = await adapter.signMessage(challenge.message)
    return api.post<WalletVerifyResult>('/wallets/verify', {
      address,
      publicKey,
      signature,
      nonce: challenge.nonce,
      chain: CHAIN,
    })
  }

  async function run(id: WalletId, flow: (result: WalletVerifyResult) => Promise<void>) {
    pending.value = id
    error.value = null
    try {
      await flow(await signChallenge(id))
    } catch (err) {
      if (err instanceof WalletRejectedError) {
        error.value = err.message
      } else {
        error.value = toApiError(err)?.message ?? 'La connexion au wallet a échoué, réessayez.'
      }
    } finally {
      pending.value = null
    }
  }

  /**
   * Login page flow: the signature IS the login. Unknown wallet → the backend
   * creates the account and we route to the signup form; known wallet →
   * straight to the profile.
   */
  async function loginWithWallet(id: WalletId) {
    await run(id, async (result) => {
      if (result.mode !== 'authenticated') {
        // Only happens if a logged-in user lands on /auth/login: treat as a no-op login.
        await navigateTo('/profile')
        return
      }
      store.setTokens(result)
      const me = await fetchMe()
      // isNewAccount covers the nominal signup; the username check re-prompts
      // users who bailed out of the form on a previous visit.
      if (result.isNewAccount || !me.username) {
        await navigateTo('/auth/register')
      } else {
        await navigateTo('/profile')
      }
    })
  }

  /** Settings flow: caller is authenticated, the signature links one more wallet. */
  async function linkWallet(id: WalletId) {
    await run(id, async (result) => {
      if (result.mode !== 'linked') {
        error.value = 'Session expirée, reconnectez-vous.'
        return
      }
      await fetchMe()
    })
  }

  return { pending, error, loginWithWallet, linkWallet }
}
