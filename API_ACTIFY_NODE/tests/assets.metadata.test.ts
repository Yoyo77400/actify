import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findFirst: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { createApp } from '../app'

const listingFindFirst = vi.mocked(prisma.listing.findFirst)

let server: Server
let baseUrl: string

beforeAll(async () => {
  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}/api/v1`
})

afterAll(() => new Promise((resolve) => server.close(resolve)))

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

const listing = {
  title: 'Test Collection',
  shortDescription: 'Une pièce de test',
  description: 'Description longue',
  thumbnailCid: 'thumb-key.png',
}

function getMetadata(id = 'listing-1') {
  return fetch(`${baseUrl}/assets/${id}/metadata`)
}

describe('GET /assets/:id/metadata', () => {
  it('serves the XLS-24 document raw, without the {success, data} envelope', async () => {
    listingFindFirst.mockResolvedValue(listing as never)

    const res = await getMetadata()

    expect(res.status).toBe(200)
    // A wallet parses this body as-is: any wrapper would hide the fields.
    await expect(res.json()).resolves.toEqual({
      name: 'Test Collection',
      description: 'Une pièce de test',
      image: 'https://actify.test/api/v1/files/thumb-key.png',
    })
  })

  it('lets wallets and explorers read it cross-origin', async () => {
    listingFindFirst.mockResolvedValue(listing as never)

    const res = await getMetadata()

    // helmet defaults CORP to same-origin, which would block the very callers
    // this endpoint exists for.
    expect(res.headers.get('cross-origin-resource-policy')).toBe('cross-origin')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('is public — no session, no 401', async () => {
    listingFindFirst.mockResolvedValue(listing as never)
    await expect(getMetadata().then((r) => r.status)).resolves.toBe(200)
  })

  it('looks the asset up by id only, never by slug (a slug follows the title, the minted URI cannot)', async () => {
    listingFindFirst.mockResolvedValue(listing as never)

    await getMetadata('test-collection')

    expect(listingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'test-collection', deletedAt: null } }),
    )
  })

  it('falls back to the long description when there is no short one', async () => {
    listingFindFirst.mockResolvedValue({ ...listing, shortDescription: null } as never)
    await expect(getMetadata().then((r) => r.json())).resolves.toMatchObject({ description: 'Description longue' })
  })

  it('treats a blank shortDescription as absent — a wallet would render it as no description at all', async () => {
    listingFindFirst.mockResolvedValue({ ...listing, shortDescription: '   ' } as never)
    await expect(getMetadata().then((r) => r.json())).resolves.toMatchObject({ description: 'Description longue' })
  })

  it('omits image and description rather than emitting empty values', async () => {
    listingFindFirst.mockResolvedValue({ ...listing, shortDescription: null, description: null, thumbnailCid: null } as never)

    const body = await getMetadata().then((r) => r.json())

    expect(body).toEqual({ name: 'Test Collection' })
    expect(body).not.toHaveProperty('image')
  })

  it('serves a Draft: an asset is tokenized before it is published, and the on-chain URI must resolve from that moment on', async () => {
    listingFindFirst.mockResolvedValue({ ...listing, status: 'Draft' } as never)

    expect((await getMetadata()).status).toBe(200)
    // The invariant lives in the query, not in the mock: no status gate here,
    // unlike the catalogue view that hides Draft/Archived from non-owners.
    expect(listingFindFirst.mock.calls[0]?.[0]?.where).not.toHaveProperty('status')
  })

  it('404s for an unknown or soft-deleted asset', async () => {
    listingFindFirst.mockResolvedValue(null as never)
    await expect(getMetadata('nope').then((r) => r.status)).resolves.toBe(404)
  })

  it('500s instead of emitting a relative image URL when no public URL is configured', async () => {
    vi.stubEnv('PUBLIC_BASE_URL', '')
    listingFindFirst.mockResolvedValue(listing as never)

    const res = await getMetadata()

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'PUBLIC_URL_NOT_CONFIGURED' } })
  })
})
