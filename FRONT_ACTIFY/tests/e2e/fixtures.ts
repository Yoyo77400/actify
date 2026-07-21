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
    await use(page)
  },
})

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
