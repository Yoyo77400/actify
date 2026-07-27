import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accountOwnsNft } from '../services/chains/xrpl-nft'

const ADDRESS = 'rBuyerAddress'
const NFTOKEN_ID = '0008000047ABCDEF'
const OTHER_NFTOKEN_ID = '00080000FFFFFFFF'

function rpcResponse(result: unknown) {
  return { ok: true, json: async () => ({ result }) }
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('accountOwnsNft', () => {
  it('is true when the account holds the NFToken', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ account_nfts: [{ NFTokenID: NFTOKEN_ID }] }))

    await expect(accountOwnsNft(ADDRESS, NFTOKEN_ID)).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('https://s.altnet.rippletest.net:51234/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'account_nfts',
        params: [{ account: ADDRESS, ledger_index: 'validated' }],
      }),
      signal: expect.any(AbortSignal),
    })
  })

  it('is false when the account holds other NFTokens only', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ account_nfts: [{ NFTokenID: OTHER_NFTOKEN_ID }] }))
    await expect(accountOwnsNft(ADDRESS, NFTOKEN_ID)).resolves.toBe(false)
  })

  it('uses XRPL_RPC_URL when set', async () => {
    vi.stubEnv('XRPL_RPC_URL', 'http://localhost:5005/')
    fetchMock.mockResolvedValue(rpcResponse({ account_nfts: [] }))

    await accountOwnsNft(ADDRESS, NFTOKEN_ID)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5005/', expect.anything())
  })

  it('follows the marker across pages until the NFToken is found', async () => {
    fetchMock
      .mockResolvedValueOnce(rpcResponse({ account_nfts: [{ NFTokenID: OTHER_NFTOKEN_ID }], marker: 'page-2' }))
      .mockResolvedValueOnce(rpcResponse({ account_nfts: [{ NFTokenID: NFTOKEN_ID }] }))

    await expect(accountOwnsNft(ADDRESS, NFTOKEN_ID)).resolves.toBe(true)
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.anything(), expect.objectContaining({
      body: JSON.stringify({
        method: 'account_nfts',
        params: [{ account: ADDRESS, ledger_index: 'validated', marker: 'page-2' }],
      }),
    }))
  })

  it('stops after the page cap instead of following markers forever', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ account_nfts: [{ NFTokenID: OTHER_NFTOKEN_ID }], marker: 'next' }))

    await expect(accountOwnsNft(ADDRESS, NFTOKEN_ID)).resolves.toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  // Fail-closed: an answer we could not obtain is never read as ownership.
  it('is false on an RPC error (unfunded account, unknown method…)', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ error: 'actNotFound' }))
    await expect(accountOwnsNft(ADDRESS, NFTOKEN_ID)).resolves.toBe(false)
  })

  it('is false on an HTTP error from the RPC endpoint', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 })
    await expect(accountOwnsNft(ADDRESS, NFTOKEN_ID)).resolves.toBe(false)
  })

  it('is false when the network fails, without throwing', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    await expect(accountOwnsNft(ADDRESS, NFTOKEN_ID)).resolves.toBe(false)
  })

  it('is false on a malformed JSON body', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError('bad json') } })
    await expect(accountOwnsNft(ADDRESS, NFTOKEN_ID)).resolves.toBe(false)
  })
})
