import { WalletRejectedError, getWalletAdapter, type WalletId } from '~/lib/wallets'
import type { WalletChallenge, WalletVerifyResult } from '~/types/auth'

const CHAIN = 'xrpl'

export function useWalletAuth() {
  const store = useAuthStore()
  const api = useApi()
  const { fetchMe } = useAuth()

  const pending = ref<WalletId | null>(null)
  const error = ref<string | null>(null)

  async function signChallenge(id: WalletId, opts: { auth: boolean }): Promise<WalletVerifyResult> {
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
    }, { auth: opts.auth })
  }

  async function run(
    id: WalletId,
    opts: { auth: boolean; before?: () => Promise<void> },
    flow: (result: WalletVerifyResult) => Promise<void>,
  ) {
    pending.value = id
    error.value = null
    try {
      await opts.before?.()
      await flow(await signChallenge(id, opts))
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
   * Login page flow: the signature IS the login, so verify goes out WITHOUT
   * the Authorization header — a leftover session must not turn a login
   * attempt into a silent wallet-link on the old account. Unknown wallet →
   * the backend creates the account and we route to the signup form; known
   * wallet → straight to the profile.
   */
  async function loginWithWallet(id: WalletId) {
    await run(id, { auth: false }, async (result) => {
      if (result.mode !== 'authenticated') {
        error.value = 'Réponse inattendue du serveur, réessayez.'
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
    await run(id, {
      auth: true,
      // The access token may have expired while idling on the page. An
      // authenticated pre-flight forces the refresh-retry path BEFORE the
      // wallet signs: verify sent anonymously would auto-create an orphan
      // account owning the wallet.
      before: async () => {
        await api.get('/users/me')
      },
    }, async (result) => {
      if (result.mode !== 'linked') {
        error.value = 'Session expirée, reconnectez-vous.'
        return
      }
      await fetchMe()
    })
  }

  return { pending, error, loginWithWallet, linkWallet }
}
