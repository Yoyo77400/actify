import { getWalletAdapter, WalletRejectedError, type WalletId } from '~/lib/wallets'
import type { WalletChallenge, WalletVerifyResult } from '~/types/auth'

const CHAIN = 'xrpl'
// Wallet popups wait on the user, so give them room; API calls are bounded by
// useApi's own timeout, this is just a backstop.
const WALLET_TIMEOUT_MS = 60_000

// A failure with a ready-to-show, actionable French message.
class WalletFlowError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new WalletFlowError(message)), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

export function useWalletAuth() {
  const store = useAuthStore()
  const api = useApi()
  const { verifyLogin } = useTwoFactor()
  const { fetchMe } = useAuth()

  const pending = ref<WalletId | null>(null)
  // Human-readable current step, shown on the button so a slow flow never
  // looks frozen.
  const step = ref<string | null>(null)
  const error = ref<string | null>(null)
  // Pending token quand le wallet a signé mais que la 2FA est active.
  const totpPending = ref<string | null>(null)
  const verifying = ref(false)

  async function signChallenge(id: WalletId, opts: { auth: boolean }): Promise<WalletVerifyResult> {
    const adapter = await getWalletAdapter(id)

    step.value = `Ouverture de ${adapter.label}…`
    const { address, publicKey } = await withTimeout(
      adapter.connect(),
      WALLET_TIMEOUT_MS,
      `${adapter.label} n'a pas répondu. Ouvre l'extension, déverrouille-la et vérifie qu'elle est sur le réseau Testnet, puis réessaie.`,
    )

    step.value = 'Préparation de la demande…'
    const challenge = await api.post<WalletChallenge>('/wallets/challenge', { address, chain: CHAIN })

    step.value = `Signature dans ${adapter.label}…`
    const signature = await withTimeout(
      adapter.signMessage(challenge.message),
      WALLET_TIMEOUT_MS,
      `Signature non confirmée dans ${adapter.label}. Approuve la demande dans le wallet, puis réessaie.`,
    )

    step.value = 'Connexion…'
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
    step.value = null
    error.value = null
    try {
      await opts.before?.()
      await flow(await signChallenge(id, opts))
    } catch (err) {
      if (err instanceof WalletRejectedError || err instanceof WalletFlowError) {
        error.value = err.message
      } else if (isNetworkError(err)) {
        error.value = 'Le serveur Actify est injoignable. Vérifie que l\'API est bien démarrée (port 3000), puis réessaie.'
      } else {
        error.value = toApiError(err)?.message ?? 'La connexion a échoué, réessaie.'
      }
    } finally {
      pending.value = null
      step.value = null
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
      if (result.mode === 'totp_required') {
        totpPending.value = result.pendingToken
        return
      }
      if (result.mode !== 'authenticated') {
        error.value = 'Réponse inattendue du serveur, réessaie.'
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

  async function submitTotp(code: string) {
    if (!totpPending.value) return
    verifying.value = true
    error.value = null
    try {
      const result = await verifyLogin(totpPending.value, code)
      store.setTokens(result)
      totpPending.value = null
      await fetchMe()
      await navigateTo('/profile')
    } catch (err) {
      error.value = toApiError(err)?.message ?? 'Code invalide ou expiré, réessaie.'
    } finally {
      verifying.value = false
    }
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
        error.value = 'Session expirée, reconnecte-toi.'
        return
      }
      await fetchMe()
    })
  }

  return { pending, step, error, totpPending, verifying, loginWithWallet, submitTotp, linkWallet }
}
