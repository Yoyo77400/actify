import { test, expect, walletLogin, registerNewAccount, clearSession, gotoSecuritySettings } from './fixtures'
import { generateTotp } from './totp'

test.use({ walletPool: 'totp' })

// Le TOTP est la dernière ligne quand un wallet est compromis : on n'atteint
// cette étape qu'après une signature valide. Avec 1e6 combinaisons seulement,
// elle ne tient que si les essais sont bornés. Deux protections la couvrent :
// un throttle par IP (couvert par tests/rate-limit.routes.test.ts côté API) et
// un verrou par COMPTE, seul à résister à une attaque répartie sur plusieurs IP.
// C'est ce verrou qu'on vérifie ici, de bout en bout et tel que l'utilisateur
// le voit — il ne dépend d'aucune topologie réseau, contrairement au throttle
// par IP dont le compartiment change selon que l'app tape l'API en direct ou
// via le proxy.
test.describe('totpLoginStepUp', () => {
  // Doit rester aligné sur MAX_TOTP_ATTEMPTS (two-factor.service.ts).
  const MAX_ATTEMPTS = 5

  test('enrollsThenLocksTheAccountAfterRepeatedWrongCodes', async ({ page }) => {
    await registerNewAccount(page, 'e2e_totp')

    // ── Enrôlement 2FA, le test jouant l'app d'authentification ──
    await gotoSecuritySettings(page)
    await page.getByRole('button', { name: /Activer la 2FA/i }).click()

    const secret = (await page.locator('code').first().innerText()).trim()
    expect(secret).not.toBe('')

    await page.getByPlaceholder('000000').fill(generateTotp(secret))
    await page.getByRole('button', { name: /Activer la 2FA/i }).click()
    await expect(page.getByText(/2FA est désormais activée/i)).toBeVisible()

    // ── Une signature wallet ne suffit plus à ouvrir la session ──
    await clearSession(page)
    await walletLogin(page)
    await expect(page.getByText(/Vérification en deux étapes/i)).toBeVisible()

    const code = page.getByPlaceholder('000000')
    const submit = page.getByRole('button', { name: /Vérifier le code/i })

    // Un code faux est refusé et n'ouvre aucune session.
    await code.fill('000000')
    await submit.click()
    await expect(page.getByRole('alert')).toContainText(/invalide/i)
    await expect(page).toHaveURL(/\/auth\/login/)

    // ── Les essais répétés verrouillent le compte ──
    for (let attempt = 2; attempt <= MAX_ATTEMPTS; attempt++) {
      await code.fill(String(attempt).repeat(6))
      await submit.click()
      await expect(page.getByRole('alert')).toBeVisible()
    }

    await expect(page.getByRole('alert')).toContainText(/Trop de codes incorrects/i)

    // Le verrou porte sur le COMPTE : même le bon code est refusé, sinon un
    // attaquant reprendrait ses essais là où il s'est arrêté.
    await code.fill(generateTotp(secret))
    await submit.click()
    await expect(page.getByRole('alert')).toContainText(/Trop de codes incorrects/i)
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
