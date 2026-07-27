import { test, expect, registerNewAccount, gotoPrivacySettings } from './fixtures'
import { E2E_EXPORT } from './accounts'
import { readFile } from 'node:fs/promises'

test.use({ walletSeed: E2E_EXPORT.seed })

// GDPR portability: the export route sits behind requireTotp, which must stay a
// no-op for accounts that never enrolled 2FA. It regressed into a hard 403 once
// already — a legal obligation silently failing for most users.
test.describe('gdprDataExport', () => {
  test('exportsAccountDataWithout2faEnrolled', async ({ page }) => {
    await registerNewAccount(page, 'e2e_export')

    await gotoPrivacySettings(page)

    const [download, response] = await Promise.all([
      page.waitForEvent('download'),
      page.waitForResponse(res => res.url().includes('/users/me/data-export')),
      page.getByRole('button', { name: /Télécharger mes données/i }).click(),
    ])

    // The regression to guard: 403 TWO_FACTOR_REQUIRED on a 2FA-less account.
    expect(response.status()).toBe(200)
    await expect(page.getByText(/Export téléchargé/i)).toBeVisible()

    // The file must actually carry this user's data, not an empty envelope.
    const path = await download.path()
    const payload = JSON.parse(await readFile(path, 'utf8'))
    expect(JSON.stringify(payload)).toContain('e2e_export')
    expect(JSON.stringify(payload)).toContain(E2E_EXPORT.address)
  })
})
