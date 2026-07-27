import { test as base, expect, type Page } from '@playwright/test'
import { E2E_USER } from './accounts'

/**
 * Base test extended so every page has a test wallet wired in.
 *
 * `addInitScript` sets window.__ACTIFY_E2E_WALLET__ before any app code runs;
 * getWalletAdapter() then returns the in-page signer instead of the real
 * Crossmark/GemWallet extension (see app/lib/wallets/e2e.ts). Override the seed
 * per file/test with `test.use({ walletSeed: E2E_ADMIN.seed })`.
 */
export const test = base.extend<{ walletSeed: string }>({
  walletSeed: [E2E_USER.seed, { option: true }],

  page: async ({ page, walletSeed }, use) => {
    await page.addInitScript((seed) => {
      ;(window as unknown as { __ACTIFY_E2E_WALLET__?: { seed: string } }).__ACTIFY_E2E_WALLET__ = { seed }
    }, walletSeed)
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
