import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { signAccessToken, signRefreshToken } from '../utils/jwt'

vi.mock('../services/prisma', () => ({
  prisma: { session: { findUnique: vi.fn(), update: vi.fn() } },
}))

import { prisma } from '../services/prisma'
import { createApp } from '../app'

const findUnique = vi.mocked(prisma.session.findUnique)

const SESSION_ID = 'session-1'

// /auth/refresh est adossé à la session serveur : c'est elle qui autorise la
// rotation, pas le seul contenu du jeton.
function activeSession(userOverrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    userId: 'user-1',
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    user: { id: 'user-1', deletedAt: null, isBanned: false, ...userOverrides },
  }
}

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
  data?: { accessToken?: string; refreshToken?: string }
  error?: { code: string }
}

async function postRefresh(body: unknown) {
  const res = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, json: (await res.json()) as Envelope }
}

// HTTP-level coverage: route wiring, the {success, data|error} envelope and the
// AppError -> errorHandler mapping — things the service unit tests cannot see.
describe('POST /api/v1/auth/refresh', () => {
  beforeEach(() => {
    findUnique.mockReset()
  })

  it('returns 200 with a rotated token pair in the success envelope', async () => {
    findUnique.mockResolvedValue(activeSession() as never)
    const { status, json } = await postRefresh({ refreshToken: signRefreshToken('user-1', { sid: SESSION_ID }) })
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(typeof json.data?.accessToken).toBe('string')
    expect(typeof json.data?.refreshToken).toBe('string')
  })

  it('returns 400 VALIDATION_ERROR when refreshToken is missing', async () => {
    const { status, json } = await postRefresh({})
    expect(status).toBe(400)
    expect(json).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
  })

  it('returns 401 AUTH_REQUIRED for an access token posing as refresh token', async () => {
    const { status, json } = await postRefresh({ refreshToken: signAccessToken('user-1', { sid: SESSION_ID }) })
    expect(status).toBe(401)
    expect(json.error?.code).toBe('AUTH_REQUIRED')
  })

  it('returns 403 USER_BANNED for a banned user', async () => {
    findUnique.mockResolvedValue(activeSession({ isBanned: true }) as never)
    const { status, json } = await postRefresh({ refreshToken: signRefreshToken('user-1', { sid: SESSION_ID }) })
    expect(status).toBe(403)
    expect(json.error?.code).toBe('USER_BANNED')
  })
})
