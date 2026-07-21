import { test, expect, walletLogin } from './fixtures'

test.describe('walletLogin', () => {
  test('newWalletCreatesAccountAndOpensSession', async ({ page }) => {
    await walletLogin(page, 'GemWallet')

    // Nouveau compte (DB pglite vierge) → le flow route vers l'inscription.
    await expect(page).toHaveURL(/\/auth\/register/)

    // Une vraie session a été ouverte : le backend a vérifié la signature et
    // émis des tokens, stockés en cookie côté front.
    const cookies = await page.context().cookies()
    expect(cookies.find(c => c.name === 'actify_token')?.value).toBeTruthy()
  })

  test.describe('noWalletAvailable', () => {
    // Seed vide → l'adapter e2e se déclare indisponible et l'extension réelle
    // est absente : le bouton doit rester désactivé.
    test.use({ walletSeed: '' })

    test('loginButtonStaysDisabled', async ({ page }) => {
      await page.goto('/auth/login')
      await expect(page.getByRole('button', { name: /GemWallet/i })).toBeDisabled()
      await expect(page).toHaveURL(/\/auth\/login/)
    })
  })
})
