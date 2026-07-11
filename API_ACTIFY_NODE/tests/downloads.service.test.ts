import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../services/prisma', () => ({
  prisma: {
    listing: { findFirst: vi.fn() },
    purchase: { findFirst: vi.fn() },
    download: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { listMyDownloads, requestDownload, resolveDownloadUrl } from '../services/downloads.service'

const listingFindFirst = vi.mocked(prisma.listing.findFirst)
const purchaseFindFirst = vi.mocked(prisma.purchase.findFirst)
const downloadCount = vi.mocked(prisma.download.count)
const downloadCreate = vi.mocked(prisma.download.create)
const downloadFindMany = vi.mocked(prisma.download.findMany)

const JWT_SECRET = process.env.JWT_SECRET!
const ONE_HOUR_MS = 60 * 60 * 1000
const CLOCK_TOLERANCE_MS = 2000

const freeListing = {
  id: 'listing-1',
  isFree: true,
  maxDownloads: null,
  fileIpfsCid: 'QmCid',
}

describe('requestDownload', () => {
  beforeEach(() => {
    listingFindFirst.mockReset()
    purchaseFindFirst.mockReset()
    downloadCount.mockReset()
    downloadCreate.mockReset()
  })

  it('issues a signed download token for a free listing', async () => {
    listingFindFirst.mockResolvedValue(freeListing as never)
    downloadCreate.mockResolvedValue({} as never)

    const { downloadToken, expiresAt } = await requestDownload('user-1', 'listing-1')

    const payload = jwt.verify(downloadToken, JWT_SECRET) as jwt.JwtPayload
    expect(payload).toMatchObject({ sub: 'user-1', cid: 'QmCid', listingId: 'listing-1', type: 'download' })
    expect(Math.abs(payload.exp! * 1000 - expiresAt.getTime())).toBeLessThan(CLOCK_TOLERANCE_MS)
    expect(Math.abs(expiresAt.getTime() - Date.now() - ONE_HOUR_MS)).toBeLessThan(CLOCK_TOLERANCE_MS)

    expect(downloadCreate).toHaveBeenCalledWith({ data: { userId: 'user-1', listingId: 'listing-1' } })
    // Free listing: no purchase lookup needed.
    expect(purchaseFindFirst).not.toHaveBeenCalled()
  })

  it('accepts a paid listing when the caller has a Confirmed purchase', async () => {
    listingFindFirst.mockResolvedValue({ ...freeListing, isFree: false } as never)
    purchaseFindFirst.mockResolvedValue({ id: 'purchase-1' } as never)
    downloadCreate.mockResolvedValue({} as never)

    const { downloadToken } = await requestDownload('user-1', 'listing-1')

    expect(purchaseFindFirst).toHaveBeenCalledWith({
      where: { buyerId: 'user-1', listingId: 'listing-1', status: 'Confirmed' },
    })
    expect(jwt.verify(downloadToken, JWT_SECRET)).toMatchObject({ type: 'download' })
  })

  it('rejects with 404 when the listing does not exist, is not Published or is deleted', async () => {
    listingFindFirst.mockResolvedValue(null)

    await expect(requestDownload('user-1', 'listing-1')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(listingFindFirst).toHaveBeenCalledWith({
      where: { id: 'listing-1', status: 'Published', deletedAt: null },
    })
    expect(downloadCreate).not.toHaveBeenCalled()
  })

  it('rejects with 403 LICENSE_NOT_FOUND for a paid listing without a Confirmed purchase', async () => {
    listingFindFirst.mockResolvedValue({ ...freeListing, isFree: false } as never)
    purchaseFindFirst.mockResolvedValue(null)

    await expect(requestDownload('user-1', 'listing-1')).rejects.toMatchObject({
      status: 403,
      code: 'LICENSE_NOT_FOUND',
    })
    expect(downloadCreate).not.toHaveBeenCalled()
  })

  it('rejects with 410 MAX_DOWNLOADS_REACHED when the global cap is hit', async () => {
    listingFindFirst.mockResolvedValue({ ...freeListing, maxDownloads: 2 } as never)
    downloadCount.mockResolvedValue(2)

    await expect(requestDownload('user-1', 'listing-1')).rejects.toMatchObject({
      status: 410,
      code: 'MAX_DOWNLOADS_REACHED',
    })
    expect(downloadCreate).not.toHaveBeenCalled()
  })

  it('allows the download while the cap is not reached', async () => {
    listingFindFirst.mockResolvedValue({ ...freeListing, maxDownloads: 2 } as never)
    downloadCount.mockResolvedValue(1)
    downloadCreate.mockResolvedValue({} as never)

    const { downloadToken } = await requestDownload('user-1', 'listing-1')

    expect(downloadCount).toHaveBeenCalledWith({ where: { listingId: 'listing-1' } })
    expect(jwt.verify(downloadToken, JWT_SECRET)).toMatchObject({ type: 'download' })
  })

  it('rejects with 404 when the listing has no attached file', async () => {
    listingFindFirst.mockResolvedValue({ ...freeListing, fileIpfsCid: null } as never)

    await expect(requestDownload('user-1', 'listing-1')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(downloadCreate).not.toHaveBeenCalled()
  })
})

describe('resolveDownloadUrl', () => {
  function signDownloadToken(overrides: Record<string, unknown> = {}, expiresIn = '1h') {
    return jwt.sign(
      { sub: 'user-1', cid: 'QmCid', listingId: 'listing-1', type: 'download', ...overrides },
      JWT_SECRET,
      { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] },
    )
  }

  it('returns the IPFS gateway URL for a valid download token', () => {
    expect(resolveDownloadUrl(signDownloadToken())).toBe('https://ipfs.io/ipfs/QmCid')
  })

  it('rejects a malformed token with 401', () => {
    expect(() => resolveDownloadUrl('not-a-jwt')).toThrowError(
      expect.objectContaining({ status: 401, code: 'AUTH_REQUIRED' }),
    )
  })

  it('rejects an expired token with 401', () => {
    expect(() => resolveDownloadUrl(signDownloadToken({}, '-1s'))).toThrowError(
      expect.objectContaining({ status: 401, code: 'AUTH_REQUIRED' }),
    )
  })

  it('rejects a valid JWT that is not a download token', () => {
    const accessLikeToken = jwt.sign({ sub: 'user-1' }, JWT_SECRET, { expiresIn: '1h' })
    expect(() => resolveDownloadUrl(accessLikeToken)).toThrowError(
      expect.objectContaining({ status: 401, code: 'AUTH_REQUIRED' }),
    )
  })
})

describe('listMyDownloads', () => {
  beforeEach(() => {
    downloadFindMany.mockReset()
    downloadCount.mockReset()
  })

  it('returns the caller downloads newest first with a listing summary and meta', async () => {
    const rows = [
      {
        id: 'download-1',
        userId: 'user-1',
        listingId: 'listing-1',
        downloadedAt: new Date(),
        listing: { id: 'listing-1', slug: 'my-asset', title: 'My asset', thumbnailCid: 'QmThumb' },
      },
    ]
    downloadFindMany.mockResolvedValue(rows as never)
    downloadCount.mockResolvedValue(1)

    const { items, meta } = await listMyDownloads('user-1', { page: 1, limit: 20, skip: 0 })

    expect(items).toEqual(rows)
    expect(meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 })
    expect(downloadFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { downloadedAt: 'desc' },
      skip: 0,
      take: 20,
      include: { listing: { select: { id: true, slug: true, title: true, thumbnailCid: true } } },
    })
    expect(downloadCount).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
  })
})
