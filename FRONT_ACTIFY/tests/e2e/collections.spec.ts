import { test, expect, registerNewAccount, attemptUsername } from './fixtures'

test.use({ walletPool: 'collections' })

// Collections existed as an inert table: no owner column, no write API, nothing
// could create one. This covers the loop that made them real.
test.describe('collectionManagement', () => {
  test('createsRenamesAndDeletesFromTheProfile', async ({ page }) => {
    await registerNewAccount(page, 'e2e_collections')
    const name = attemptUsername('Neon Dreams')

    await expect(page.getByText(/Aucune collection pour le moment/)).toBeVisible()

    // ── Create ──
    await page.getByRole('button', { name: /Créer ma première collection/i }).click()
    await page.getByPlaceholder('ex : Neon Dreams').fill(name)
    await page.locator('form').getByRole('button', { name: /^Créer$/ }).click()

    // Each card exposes two links to the same collection (cover + title), so
    // target the title one explicitly rather than relaxing strict mode.
    const card = page.locator('section').filter({ hasText: 'Mes collections' })
    const title = (label: string) => card.getByRole('link', { name: label }).last()
    await expect(title(name)).toBeVisible()

    // A second collection with the same name is refused, not silently suffixed.
    await page.getByRole('button', { name: /Nouvelle collection/i }).click()
    await page.getByPlaceholder('ex : Neon Dreams').fill(name)
    await page.locator('form').getByRole('button', { name: /^Créer$/ }).click()
    await expect(page.getByRole('alert')).toContainText(/porte déjà ce nom/i)
    await page.locator('form').getByRole('button', { name: /Annuler/i }).click()

    // ── The public page is reachable and reflects the collection ──
    await title(name).click()
    await expect(page).toHaveURL(/\/collections\//)
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.getByText(/Aucun asset publié dans cette collection/)).toBeVisible()

    // ── Rename, then delete (two-step confirm) ──
    await page.goto('/profile')
    await card.getByRole('button', { name: /^Renommer$/ }).first().click()
    await page.getByPlaceholder('ex : Neon Dreams').fill(`${name} v2`)
    await page.locator('form').getByRole('button', { name: /^Renommer$/ }).click()
    await expect(title(`${name} v2`)).toBeVisible()

    await card.getByRole('button', { name: /^Supprimer$/ }).click()
    await card.getByRole('button', { name: /Confirmer \?/ }).click()
    await expect(page.getByText(/Aucune collection pour le moment/)).toBeVisible()
  })
})
