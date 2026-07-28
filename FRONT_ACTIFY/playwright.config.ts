/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test'
import { E2E_ADMIN } from './tests/e2e/accounts'

const FRONT_PORT = 8080
const API_PORT = 3000
const FRONT_URL = `http://localhost:${FRONT_PORT}`
const API_BASE = `http://localhost:${API_PORT}/api/v1`

/**
 * True end-to-end: the real Nuxt front talks to the real Node API, which runs
 * against an in-memory pglite Postgres. The only substituted boundary is the
 * wallet browser-extension, replaced by an in-page signer that produces real
 * XRPL signatures the backend cryptographically verifies. See ../README.md.
 *
 * Every e2e spec of the project lives here; the API side only ships the harness
 * that boots it (API_ACTIFY_NODE/tests/e2e-harness).
 */
export default defineConfig({
  testDir: './tests/e2e/',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: FRONT_URL,
    trace: 'on-first-retry',
    // Ralentit chaque action pour l'observation en --headed. 0 par défaut
    // (aucun impact headless/CI) ; SLOWMO=800 pour voir les clics.
    launchOptions: { slowMo: Number(process.env.SLOWMO) || 0 },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Both servers are booted by Playwright and torn down after the run.
  webServer: [
    {
      // Real API on an ephemeral in-memory Postgres (pglite). ADMIN_WALLET_ADDRESS
      // auto-promotes the e2e admin wallet on first login.
      command: 'npm run test:e2e:server',
      cwd: '../API_ACTIFY_NODE',
      url: `${API_BASE}/health`,
      timeout: 120_000,
      // NEVER reuse an API already on this port. The suite assumes the pglite
      // database is empty (its wallets are fixed seeds, so "new wallet →
      // /auth/register" only holds on a fresh DB). Reusing a dev API silently
      // ran the tests against the persistent Postgres, where those accounts
      // already exist — three specs failed for a reason unrelated to the code.
      // Failing to bind gives an explicit "port already used" instead.
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: String(API_PORT),
        JWT_SECRET: 'e2e-secret',
        ADMIN_WALLET_ADDRESS: E2E_ADMIN.address,
      },
    },
    {
      // Nuxt dev build — import.meta.dev must be true for the e2e wallet seam.
      command: 'npm run dev',
      url: FRONT_URL,
      timeout: 120_000,
      // Same reasoning as the API above: a dev front already running points at
      // the dev API, not at the ephemeral one this config starts.
      reuseExistingServer: false,
      env: {
        PORT: String(FRONT_PORT),
        NUXT_PUBLIC_API_BASE: API_BASE,
      },
    },
  ],
})
