import { test, expect, walletLogin, clearSession } from './fixtures'
import { E2E_SIGNUP } from './accounts'

test.use({ walletSeed: E2E_SIGNUP.seed })

// Every new user goes through this exact path, so a break here locks the whole
// marketplace's front door. auth.spec.ts stops at the redirect to /auth/register;
// this carries it through to a usable, persisted account.
test.describe('signupCompletion', () => {
  test('completesProfileAndLandsOnPersistedSession', async ({ page }) => {
    await walletLogin(page)
    await expect(page).toHaveURL(/\/auth\/register/)

    // The verified wallet is echoed back so the user can confirm what they signed with.
    await expect(page.getByText(E2E_SIGNUP.address)).toBeVisible()

    await page.getByLabel('Username').fill('e2e_signup')
    await page.getByLabel('Nom affiché').fill('E2E Signup')
    await page.getByRole('button', { name: /Créer mon compte/i }).click()

    await expect(page).toHaveURL(/\/profile/)
    await expect(page.getByText('@e2e_signup')).toBeVisible()

    // The profile was persisted server-side, not just held in the store: a
    // reload rehydrates it from the token cookies via the session plugin.
    await page.reload()
    await expect(page).toHaveURL(/\/profile/)
    await expect(page.getByText('@e2e_signup')).toBeVisible()

    // Signing in again with the now-known wallet skips registration entirely.
    await clearSession(page)
    await walletLogin(page)
    await expect(page).toHaveURL(/\/profile/)
    await expect(page.getByText('@e2e_signup')).toBeVisible()
  })
})
