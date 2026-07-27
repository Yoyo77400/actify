import { test, expect, searchFromTopbar } from './fixtures'

// The topbar box used to be a decorative <input> with no handler at all. It now
// has to reach a results page covering the three entity types the API exposes.
// The e2e API keeps one database for the whole run, so an assertion like
// "no results at all" would break as soon as another spec creates something.
const TERM = 'zzzq' + Date.now().toString().slice(-6)

test.describe('globalSearch', () => {
  test('routesFromTopbarAndQueriesTheThreeEntityTypes', async ({ page, request }) => {
    await page.goto('/')

    // The term lands in the URL, so a results page stays shareable/reloadable.
    // A term no fixture can create, so this assertion never depends on what
    // other specs left in the shared database.
    await searchFromTopbar(page, TERM)
    await expect(page).toHaveURL(new RegExp(`/search\\?q=${TERM}`))
    await expect(page.getByRole('heading', { name: 'Recherche' })).toBeVisible()

    // An empty database must say so rather than render a broken page.
    await expect(page.getByText(/Aucun résultat pour/)).toBeVisible()

    // The API backing the page answers with the three buckets — the front
    // renders a section per bucket, so a missing one would silently vanish.
    const res = await request.get(`http://localhost:3000/api/v1/search?q=${TERM}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveProperty('assets')
    expect(body.data).toHaveProperty('creators')
    expect(body.data).toHaveProperty('collections')
  })

  test('showsAnEmptyStateBeforeAnyTerm', async ({ page }) => {
    await page.goto('/search')
    await expect(page.getByText(/Saisissez un nom d'asset/)).toBeVisible()
  })
})

test.describe('collections', () => {
  test('listsThemAndDeepLinksToOne', async ({ page }) => {
    await page.goto('/collections')
    await expect(page.getByRole('heading', { name: 'Collections' })).toBeVisible()
    // Either state is valid depending on what other specs created; what matters
    // is that the page renders one of them instead of erroring.
    await expect(
      page.getByText(/Aucune collection pour le moment/).or(page.locator('a[href^="/collections/"]').first()),
    ).toBeVisible()
  })

  test('unknownSlugIs404', async ({ page }) => {
    const res = await page.goto('/collections/slug-qui-nexiste-pas')
    expect(res?.status()).toBe(404)
  })
})
