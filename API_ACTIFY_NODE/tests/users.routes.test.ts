import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { signAccessToken } from '../utils/jwt'

vi.mock('../services/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    listing: { findMany: vi.fn() },
    purchase: { findMany: vi.fn() },
    download: { findMany: vi.fn() },
    review: { findMany: vi.fn() },
    favorite: { findMany: vi.fn() },
    nft: { findMany: vi.fn() },
    resale: { findMany: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { createApp } from '../app'

const userFindUnique = vi.mocked(prisma.user.findUnique)
const userFindUniqueOrThrow = vi.mocked(prisma.user.findUniqueOrThrow)
const listingFindMany = vi.mocked(prisma.listing.findMany)
const purchaseFindMany = vi.mocked(prisma.purchase.findMany)
const downloadFindMany = vi.mocked(prisma.download.findMany)
const reviewFindMany = vi.mocked(prisma.review.findMany)
const favoriteFindMany = vi.mocked(prisma.favorite.findMany)
const nftFindMany = vi.mocked(prisma.nft.findMany)
const resaleFindMany = vi.mocked(prisma.resale.findMany)

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

function getDataExport(token: string) {
  return fetch(`${baseUrl}/users/me/data-export`, {
    headers: { authorization: `Bearer ${token}` },
  })
}

const twoFactorUser = {
  id: 'user-1',
  deletedAt: null,
  isBanned: false,
  twoFactorEnabled: true,
  role: { id: 1, name: 'user' },
  wallets: [] as unknown[],
}

// HTTP-level coverage of the requireTotp gate: the export leaks the full
// profile + activity history, same sensitivity as DELETE /users/me right
// above it, which already requires the 2FA step-up.
describe('GET /api/v1/users/me/data-export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userFindUnique.mockResolvedValue(twoFactorUser as never)
  })

  it('rejects a session token without the mfa step-up on a 2FA-enabled account', async () => {
    const token = signAccessToken('user-1')
    const res = await getDataExport(token)
    expect(res.status).toBe(403)
    const json = (await res.json()) as Envelope
    expect(json.error?.code).toBe('TWO_FACTOR_REQUIRED')
  })

  it('allows the export once the session carries mfa:true', async () => {
    userFindUniqueOrThrow.mockResolvedValue(twoFactorUser as never)
    listingFindMany.mockResolvedValue([])
    purchaseFindMany.mockResolvedValue([])
    downloadFindMany.mockResolvedValue([])
    reviewFindMany.mockResolvedValue([])
    favoriteFindMany.mockResolvedValue([])
    nftFindMany.mockResolvedValue([])
    resaleFindMany.mockResolvedValue([])

    const token = signAccessToken('user-1', { mfa: true })
    const res = await getDataExport(token)
    expect(res.status).toBe(200)
  })

  it('does not require the step-up on an account without 2FA enabled', async () => {
    userFindUnique.mockResolvedValue({ ...twoFactorUser, twoFactorEnabled: false } as never)
    userFindUniqueOrThrow.mockResolvedValue({ ...twoFactorUser, twoFactorEnabled: false } as never)
    listingFindMany.mockResolvedValue([])
    purchaseFindMany.mockResolvedValue([])
    downloadFindMany.mockResolvedValue([])
    reviewFindMany.mockResolvedValue([])
    favoriteFindMany.mockResolvedValue([])
    nftFindMany.mockResolvedValue([])
    resaleFindMany.mockResolvedValue([])

    const token = signAccessToken('user-1')
    const res = await getDataExport(token)
    expect(res.status).toBe(200)
  })
})
