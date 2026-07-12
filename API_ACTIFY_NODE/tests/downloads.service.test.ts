import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../services/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    listing: { findFirst: vi.fn() },
    purchase: { findFirst: vi.fn() },
    download: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
  },
}))

import { prisma } from '../services/prisma'
import { listMyDownloads, requestDownload, resolveDownloadFile } from '../services/downloads.service'

const userFindUnique = vi.mocked(prisma.user.findUnique)
const listingFindFirst = vi.mocked(prisma.listing.findFirst)
const purchaseFindFirst = vi.mocked(prisma.purchase.findFirst)
const downloadFindFirst = vi.mocked(prisma.download.findFirst)
const downloadFindMany = vi.mocked(prisma.download.findMany)
const downloadCreate = vi.mocked(prisma.download.create)
const downloadCount = vi.mocked(prisma.download.count)

const JWT_SECRET = process.env.JWT_SECRET!
const ONE_HOUR_MS = 60 * 60 * 1000
const CLOCK_TOLERANCE_MS = 2000

const activeUser = { id: 'user-1', deletedAt: null, isBanned: false }
const freeListing = { id: 'listing-1', isFree: true, maxDownloads: null, fileIpfsCid: 'QmCid' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requestDownload', () => {
  it('issues a signed download token for a free listing', async () => {
    userFindUnique.mockResolvedValue(activeUser as never)
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

  it('rejects a banned or deleted user with 403', async () => {
    userFindUnique.mockResolvedValue({ ...activeUser, isBanned: true } as never)
    listingFindFirst.mockResolvedValue(freeListing as never)

    await expect(requestDownload('user-1', 'listing-1')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(downloadCreate).not.toHaveBeenCalled()
  })

  it('accepts a paid listing when the caller has a Confirmed purchase', async () => {
    userFindUnique.mockResolvedValue(activeUser as never)
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
    userFindUnique.mockResolvedValue(activeUser as never)
    listingFindFirst.mockResolvedValue({ ...freeListing, isFree: false } as never)
    purchaseFindFirst.mockResolvedValue(null)

    await expect(requestDownload('user-1', 'listing-1')).rejects.toMatchObject({
      status: 403,
      code: 'LICENSE_NOT_FOUND',
    })
    expect(downloadCreate).not.toHaveBeenCalled()
  })

  it('rejects with 410 when a NEW downloader would exceed the distinct-user cap', async () => {
    userFindUnique.mockResolvedValue(activeUser as never)
    listingFindFirst.mockResolvedValue({ ...freeListing, maxDownloads: 2 } as never)
    downloadFindFirst.mockResolvedValue(null) // this user has not downloaded before
    downloadFindMany.mockResolvedValue([{ userId: 'a' }, { userId: 'b' }] as never)

    await expect(requestDownload('user-1', 'listing-1')).rejects.toMatchObject({
      status: 410,
      code: 'MAX_DOWNLOADS_REACHED',
    })
    expect(downloadCreate).not.toHaveBeenCalled()
  })

  it('lets an existing downloader re-request even when the cap is full', async () => {
    userFindUnique.mockResolvedValue(activeUser as never)
    listingFindFirst.mockResolvedValue({ ...freeListing, maxDownloads: 2 } as never)
    downloadFindFirst.mockResolvedValue({ id: 'download-prev' } as never) // already downloaded
    downloadCreate.mockResolvedValue({} as never)

    const { downloadToken } = await requestDownload('user-1', 'listing-1')

    expect(downloadFindMany).not.toHaveBeenCalled() // distinct-count skipped for existing downloaders
    expect(jwt.verify(downloadToken, JWT_SECRET)).toMatchObject({ type: 'download' })
  })

  it('lets a new downloader through while the cap is not reached', async () => {
    userFindUnique.mockResolvedValue(activeUser as never)
    listingFindFirst.mockResolvedValue({ ...freeListing, maxDownloads: 2 } as never)
    downloadFindFirst.mockResolvedValue(null)
    downloadFindMany.mockResolvedValue([{ userId: 'a' }] as never)
    downloadCreate.mockResolvedValue({} as never)

    const { downloadToken } = await requestDownload('user-1', 'listing-1')
    expect(jwt.verify(downloadToken, JWT_SECRET)).toMatchObject({ type: 'download' })
  })

  it('rejects with 404 when the listing has no attached file', async () => {
    userFindUnique.mockResolvedValue(activeUser as never)
    listingFindFirst.mockResolvedValue({ ...freeListing, fileIpfsCid: null } as never)

    await expect(requestDownload('user-1', 'listing-1')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(downloadCreate).not.toHaveBeenCalled()
  })
})

describe('resolveDownloadFile', () => {
  function signDownloadToken(overrides: Record<string, unknown> = {}, expiresIn = '1h') {
    return jwt.sign(
      { sub: 'user-1', cid: 'stored-key.zip', listingId: 'listing-1', type: 'download', ...overrides },
      JWT_SECRET,
      { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] },
    )
  }

  it('returns the stored file key + a friendly name when the entitlement still holds', async () => {
    userFindUnique.mockResolvedValue(activeUser as never)
    listingFindFirst.mockResolvedValue({ ...freeListing, slug: 'my-asset' } as never)

    await expect(resolveDownloadFile(signDownloadToken())).resolves.toEqual({
      key: 'stored-key.zip',
      downloadName: 'my-asset.zip',
    })
  })

  it('rejects a token whose listing was unpublished/deleted after issuance', async () => {
    listingFindFirst.mockResolvedValue(null)
    await expect(resolveDownloadFile(signDownloadToken())).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('rejects a token whose owner was banned after issuance', async () => {
    userFindUnique.mockResolvedValue({ ...activeUser, isBanned: true } as never)
    listingFindFirst.mockResolvedValue(freeListing as never)
    await expect(resolveDownloadFile(signDownloadToken())).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })

  it('rejects a paid-asset token once the purchase is no longer Confirmed', async () => {
    userFindUnique.mockResolvedValue(activeUser as never)
    listingFindFirst.mockResolvedValue({ ...freeListing, isFree: false } as never)
    purchaseFindFirst.mockResolvedValue(null)
    await expect(resolveDownloadFile(signDownloadToken())).rejects.toMatchObject({
      status: 403,
      code: 'LICENSE_NOT_FOUND',
    })
  })

  it('rejects a malformed token with 401', async () => {
    await expect(resolveDownloadFile('not-a-jwt')).rejects.toMatchObject({ status: 401, code: 'AUTH_REQUIRED' })
  })

  it('rejects an expired token with 401', async () => {
    await expect(resolveDownloadFile(signDownloadToken({}, '-1s'))).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_REQUIRED',
    })
  })

  it('rejects a valid JWT that is not a download token', async () => {
    const accessLikeToken = jwt.sign({ sub: 'user-1' }, JWT_SECRET, { expiresIn: '1h' })
    await expect(resolveDownloadFile(accessLikeToken)).rejects.toMatchObject({ status: 401, code: 'AUTH_REQUIRED' })
  })
})

describe('listMyDownloads', () => {
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
    downloadCount.mockResolvedValue(1 as never)

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
