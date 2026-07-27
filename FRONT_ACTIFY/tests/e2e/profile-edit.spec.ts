import { test, expect, registerNewAccount } from './fixtures'

test.use({ walletPool: 'profile' })

// The "Edit profile" button was wired to nothing at all, and the banner had no
// column behind it — this covers the whole round-trip: modal → PUT /users/me and
// the two image uploads → values still there after a reload.
test.describe('profileEdition', () => {
  // A tiny valid PNG, so the API's image MIME filter accepts the upload.
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )

  test('editsProfileAndUploadsBothImages', async ({ page }) => {
    await registerNewAccount(page, 'e2e_profile')

    await page.getByRole('button', { name: /Edit profile/i }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    // Nothing may reach the server before "Enregistrer" — an edit that is
    // cancelled must leave the profile untouched.
    let uploaded = 0
    page.on('response', (res) => {
      if (/\/users\/me\/(avatar|banner)/.test(res.url())) uploaded++
    })

    await modal.locator('input[type="file"]').nth(0)
      .setInputFiles({ name: 'banner.png', mimeType: 'image/png', buffer: PNG })
    await modal.locator('input[type="file"]').nth(1)
      .setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await modal.getByLabel('Nom affiché').fill('Annulé')
    await modal.getByRole('button', { name: /Annuler/i }).click()

    await expect(modal).toBeHidden()
    expect(uploaded, 'cancelling must not upload anything').toBe(0)
    await expect(page.getByRole('heading', { name: 'Annulé' })).toBeHidden()

    // ── Now the real edit ──
    await page.getByRole('button', { name: /Edit profile/i }).click()
    await expect(modal).toBeVisible()

    const bannerUpload = page.waitForResponse(res => res.url().includes('/users/me/banner'))
    const avatarUpload = page.waitForResponse(res => res.url().includes('/users/me/avatar'))
    await modal.locator('input[type="file"]').nth(0)
      .setInputFiles({ name: 'banner.png', mimeType: 'image/png', buffer: PNG })
    await modal.locator('input[type="file"]').nth(1)
      .setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await modal.getByLabel('Nom affiché').fill('Profil E2E')
    await modal.getByLabel('Bio').fill('Bio écrite par le test e2e.')
    await modal.getByRole('button', { name: /Enregistrer/i }).click()

    // The images travel on save, not on pick.
    expect((await bannerUpload).status()).toBe(201)
    expect((await avatarUpload).status()).toBe(201)

    await expect(modal).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Profil E2E' })).toBeVisible()
    await expect(page.getByText('Bio écrite par le test e2e.')).toBeVisible()

    // ── Persisted server-side, not just held in the store ──
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Profil E2E' })).toBeVisible()

    // Both images now resolve through the API instead of the placeholder tile.
    const banner = page.locator('section img').first()
    await expect(banner).toHaveAttribute('src', /\/api\/v1\/files\//)
  })
})
