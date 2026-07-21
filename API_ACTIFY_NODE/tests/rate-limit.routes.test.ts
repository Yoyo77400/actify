import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

vi.mock('../services/prisma', () => ({
  prisma: { walletChallenge: { create: vi.fn().mockResolvedValue({}) } },
}))

import { createApp } from '../app'

const WALLET_AUTH_LIMIT = 20

let server: Server
let baseUrl: string

beforeAll(async () => {
  server = createApp().listen(0)
  await new Promise(resolve => server.once('listening', resolve))
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}/api/v1`
})

afterAll(() => new Promise(resolve => server.close(resolve)))

interface Envelope {
  success: boolean
  error?: { code: string }
}

function postChallenge() {
  return fetch(`${baseUrl}/wallets/challenge`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address: 'rTestAddress', chain: 'xrpl' }),
  })
}

// HTTP-level coverage of the per-IP limiter: wiring on the route, the 429
// status and the {success:false, error} envelope contract.
describe('wallet auth rate limiting', () => {
  it('serves the first requests then returns 429 RATE_LIMITED past the limit', async () => {
    for (let i = 0; i < WALLET_AUTH_LIMIT; i++) {
      const res = await postChallenge()
      expect(res.status).toBe(200)
    }

    const limited = await postChallenge()
    expect(limited.status).toBe(429)
    const json = (await limited.json()) as Envelope
    expect(json.success).toBe(false)
    expect(json.error?.code).toBe('RATE_LIMITED')
  })
})
