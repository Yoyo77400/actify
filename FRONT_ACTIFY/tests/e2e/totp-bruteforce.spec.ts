import { test, expect, walletLogin, registerNewAccount, clearSession } from './fixtures'
import { E2E_TOTP } from './accounts'
import { generateTotp } from './totp'

test.use({ walletSeed: E2E_TOTP.seed })

// The 6-digit code space is only 1e6 wide and there is no account lockout, so
// /auth/verify-2fa is only brute-force-proof as long as its rate limiter stays
// wired up. Unit tests cover the limiter in isolation; this asserts the whole
// chain a real attacker faces — enrolled 2FA, the login step-up gate, and the
// throttle actually cutting the guesses off.
test.describe('totpLoginStepUp', () => {
  // Requests share the browser's source IP, so the limiter counts these too.
  const VERIFY_2FA = 'http://localhost:3000/api/v1/auth/verify-2fa'
  const MAX_GUESSES = 200

  test('enrollsThenBlocksBruteForceOnTheLoginCode', async ({ page, request }) => {
    await registerNewAccount(page, 'e2e_totp')

    // ── Enroll 2FA, acting as the user's authenticator app ──
    await page.goto('/settings/security')
    await page.getByRole('button', { name: /Activer la 2FA/i }).click()

    const secret = (await page.locator('code').first().innerText()).trim()
    expect(secret).not.toBe('')

    await page.getByPlaceholder('000000').fill(generateTotp(secret))
    await page.getByRole('button', { name: /Activer la 2FA/i }).click()
    await expect(page.getByText(/2FA est désormais activée/i)).toBeVisible()

    // ── A wallet signature alone no longer logs in ──
    await clearSession(page)
    await walletLogin(page)
    await expect(page.getByText(/Vérification en deux étapes/i)).toBeVisible()

    // A wrong code is rejected and opens no session.
    await page.getByPlaceholder('000000').fill('000000')
    await page.getByRole('button', { name: /Vérifier le code/i }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/login/)

    // ── Guessing at scale gets cut off ──
    // Loop until the throttle trips instead of assuming an exact count: the UI
    // attempt above already consumed part of the window's budget.
    let limited = false
    for (let i = 0; i < MAX_GUESSES && !limited; i++) {
      const res = await request.post(VERIFY_2FA, {
        data: { pendingToken: 'not-a-real-token', code: '000000' },
        failOnStatusCode: false,
      })
      limited = res.status() === 429
    }
    expect(limited, 'verify-2fa must start refusing guesses').toBe(true)

    // The user-facing surface is throttled too, not just direct API calls.
    await page.getByPlaceholder('000000').fill('111111')
    await page.getByRole('button', { name: /Vérifier le code/i }).click()
    await expect(page.getByRole('alert')).toContainText(/Trop de requêtes/i)
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
