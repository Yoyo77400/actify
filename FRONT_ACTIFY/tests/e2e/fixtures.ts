import { test as base, expect, type Page } from '@playwright/test'
import { WALLET_POOLS, type E2eAccount } from './accounts'

/**
 * Base test extended so every page has a test wallet wired in.
 *
 * `addInitScript` sets window.__ACTIFY_E2E_WALLET__ before any app code runs;
 * getWalletAdapter() then returns the in-page signer instead of the real
 * Crossmark/GemWallet extension (see app/lib/wallets/e2e.ts). Pick the pool per
 * file with `test.use({ walletPool: WALLET_POOLS.signup })`, or force a raw seed
 * with `test.use({ walletSeed: '' })` to simulate having no wallet at all.
 */
export const test = base.extend<{
  // The pool is named, not passed by value: Playwright reads an array given to
  // test.use() as a [value, options] tuple and would silently hand the fixture
  // just its first element.
  walletPool: keyof typeof WALLET_POOLS
  wallet: E2eAccount
  walletSeed: string | null
}>({
  walletPool: ['auth', { option: true }],
  walletSeed: [null, { option: true }],

  // A retry must not inherit the account its failed attempt created, so each
  // attempt takes the next wallet in the pool. Beyond the pool the last one is
  // reused — that only happens past the configured retry count.
  wallet: async ({ walletPool }, use, testInfo) => {
    const pool = WALLET_POOLS[walletPool]
    await use(pool[Math.min(testInfo.retry, pool.length - 1)]!)
  },

  page: async ({ page, wallet, walletSeed }, use) => {
    await page.addInitScript((seed) => {
      ;(window as unknown as { __ACTIFY_E2E_WALLET__?: { seed: string } }).__ACTIFY_E2E_WALLET__ = { seed }
    }, walletSeed ?? wallet.seed)
    // Answer the cookie banner up front: it is fixed to the bottom of every
    // page and swallows clicks aimed at the content behind it. 'rejected' keeps
    // the Umami plugin from injecting its external script.
    await page.context().addCookies([
      { name: 'actify_consent', value: 'rejected', url: FRONT_URL },
    ])
    await use(page)
  },
})

// Mirrors playwright.config.ts's FRONT_PORT — cookies must be scoped to an
// origin, and the config can't be imported here without a cycle.
const FRONT_URL = 'http://localhost:8080'

/** Logs the browser out without discarding the cookie-consent choice. */
export async function clearSession(page: Page) {
  await page.context().clearCookies({ name: 'actify_token' })
  await page.context().clearCookies({ name: 'actify_refresh' })
}

/**
 * Opens /settings/privacy and waits until it is hydrated.
 *
 * The page is server-rendered, so its buttons exist in the DOM before Vue has
 * attached any handler — a click landing in that window is silently swallowed.
 * The consent rows only render their Autoriser/Refuser control once the
 * onMounted fetch has resolved, which makes them a reliable "the client is
 * live" signal (SSR renders a placeholder there instead).
 */
export async function gotoPrivacySettings(page: Page) {
  await page.goto('/settings/privacy')
  await expect(page.getByRole('button', { name: /Autoriser|Refuser/ }).first()).toBeVisible()
}

/**
 * Opens /settings/security and waits until it is hydrated — same swallowed-click
 * hazard as above, but this page has no visual tell: its markup is identical
 * before and after hydration. Its onMounted calls fetchMe(), so the browser
 * issuing GET /users/me is the proof that client-side code is running. The
 * listener is armed before navigating, otherwise a fast response is missed.
 */
export async function gotoSecuritySettings(page: Page) {
  const hydrated = page.waitForResponse(res => res.url().includes('/users/me'))
  await page.goto('/settings/security')
  await hydrated
}

export { expect }

type WalletLabel = 'GemWallet' | 'Crossmark'

/**
 * Drives the login page through a full wallet sign-in: clicks the wallet, which
 * triggers the real challenge → sign → verify round-trip against the backend.
 * Does not assert the destination — callers decide (new account → /auth/register,
 * known account → /profile).
 */
export async function walletLogin(page: Page, wallet: WalletLabel = 'GemWallet') {
  await page.goto('/auth/login')
  await page.getByRole('button', { name: new RegExp(wallet, 'i') }).click()
}

/**
 * Full signup for the spec's wallet: sign in, then complete the profile form
 * the backend routes new accounts to. Leaves the browser on /profile with a
 * usable session, which is the starting state most scenarios need.
 */
export async function registerNewAccount(page: Page, username: string) {
  await walletLogin(page)
  await expect(page).toHaveURL(/\/auth\/register/)
  await page.getByLabel('Username').fill(username)
  await page.getByRole('button', { name: /Créer mon compte/i }).click()
  await expect(page).toHaveURL(/\/profile/)
}
