import { test, expect, walletLogin, registerNewAccount, gotoPrivacySettings } from './fixtures'

test.use({ walletPool: 'delete' })

// GDPR erasure, and the most destructive action in the app: the wallet is the
// only way in, so deleting is unrecoverable. Both halves matter — the guard must
// not let it fire by accident, and it must genuinely erase when confirmed.
test.describe('accountDeletion', () => {
  test('requiresTypedConfirmationThenRevokesAccess', async ({ page }) => {
    await registerNewAccount(page, 'e2e_delete')

    await gotoPrivacySettings(page)
    await page.getByRole('button', { name: /^Supprimer mon compte$/i }).click()

    const confirmButton = page.getByRole('button', { name: /Confirmer la suppression/i })
    const confirmInput = page.getByPlaceholder('SUPPRIMER')

    // ── The guard: nothing short of the exact word arms the button ──
    await expect(confirmButton).toBeDisabled()
    await confirmInput.fill('supprimer')
    await expect(confirmButton).toBeDisabled()

    // Backing out leaves the account untouched — the session survives a reload.
    await page.getByRole('button', { name: /Annuler/i }).click()
    await gotoPrivacySettings(page)

    // ── The real thing ──
    await page.getByRole('button', { name: /^Supprimer mon compte$/i }).click()
    await confirmInput.fill('SUPPRIMER')
    await expect(confirmButton).toBeEnabled()
    await confirmButton.click()

    await expect(page).toHaveURL(/\/$/)

    // The session is gone client-side...
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/auth\/login/)

    // ...and server-side: re-signing with the same wallet cannot reach the
    // deleted account. It is treated as an unknown wallet, i.e. a fresh signup.
    await walletLogin(page)
    await expect(page).toHaveURL(/\/auth\/register/)
  })
})
