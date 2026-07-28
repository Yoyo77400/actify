import { test, expect, registerNewAccount, clearSession, setWallet } from './fixtures'
import { WALLET_POOLS } from './accounts'

// Needs two independent accounts (an artist and a follower) alive at once,
// so it bypasses the shared `wallet`/`walletPool` fixtures - those hand out
// one account per attempt, not two. Each retry attempt gets its own pair,
// same reasoning as every single-role pool in accounts.ts: a failed
// attempt's leftover accounts must never leak into the retry.
test.describe('artistsFollow', () => {
  test('followUnfollowRoundTripUpdatesProfileAndFollowingList', async ({ page }) => {
    const { retry } = test.info()
    const pairIndex = Math.min(retry, WALLET_POOLS.artists.length / 2 - 1)
    const artistWallet = WALLET_POOLS.artists[pairIndex * 2]!
    const followerWallet = WALLET_POOLS.artists[pairIndex * 2 + 1]!

    // The artist signs up first so there is a profile for the follower to find.
    await setWallet(page, artistWallet.seed)
    const artistUsername = await registerNewAccount(page, 'e2e_artist')
    await clearSession(page)

    // The follower signs up, then follows the artist from their public profile.
    await setWallet(page, followerWallet.seed)
    await registerNewAccount(page, 'e2e_follower')

    await page.goto(`/artist/${artistUsername}/items`)
    // SSR renders the button before Vue attaches its click handler - a click
    // landing in that window is silently swallowed (same hazard fixtures.ts's
    // gotoPrivacySettings/gotoSecuritySettings work around elsewhere; this
    // page has no network call to wait on instead, so a short fixed wait is
    // the pragmatic fix).
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Suivre' }).click()
    await expect(page.getByRole('button', { name: 'Suivi ✓' })).toBeVisible()

    // The follower count badge is a static prop from the initial fetch, not
    // updated optimistically alongside the button - a reload re-fetches it.
    await page.reload()
    await expect(page.getByRole('button', { name: 'Suivi ✓' })).toBeVisible()
    await expect(page.getByText('1 abonné')).toBeVisible()

    // The artist now appears in "Mes abonnements".
    await page.goto('/artists/following')
    await expect(page.getByText(artistUsername)).toBeVisible()

    // Unfollowing from that list removes the row immediately...
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Suivi ✓' }).click()
    await expect(page.getByText('Vous ne suivez encore aucun artiste.')).toBeVisible()

    // ...and persists server-side: the artist's own profile reverts too, not
    // just the local list.
    await page.goto(`/artist/${artistUsername}/items`)
    await expect(page.getByRole('button', { name: 'Suivre' })).toBeVisible()
    await expect(page.getByText('0 abonné')).toBeVisible()
  })
})
