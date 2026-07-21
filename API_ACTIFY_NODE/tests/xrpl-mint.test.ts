import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyXrplMint } from '../services/chains/xrpl-mint'

const MINTER = 'rMinterAddress'
const TX_HASH = 'A'.repeat(64)
const NFTOKEN_ID = '000800001234567890ABCDEF'
const URI_HEX = '697066733A2F2F516D46696C6543696400' // hex of an ipfs URI
const TAXON = 0
const TRANSFER_FEE = 2500

const validMint = {
  validated: true,
  TransactionType: 'NFTokenMint',
  Account: MINTER,
  URI: URI_HEX,
  NFTokenTaxon: TAXON,
  TransferFee: TRANSFER_FEE,
  meta: { TransactionResult: 'tesSUCCESS', nftoken_id: NFTOKEN_ID },
}

function rpcResponse(result: unknown) {
  return { ok: true, json: async () => ({ result }) }
}

const fetchMock = vi.fn()

function verify(minters = [MINTER]) {
  return verifyXrplMint({
    txHash: TX_HASH,
    minters,
    expectedUriHex: URI_HEX,
    expectedTaxon: TAXON,
    expectedTransferFee: TRANSFER_FEE,
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  // One attempt by default: failure-path tests assert the final mapping and
  // must not sit through the real submit→validation polling window.
  vi.stubEnv('XRPL_TX_POLL_ATTEMPTS', '1')
  vi.stubEnv('XRPL_TX_POLL_INTERVAL_MS', '1')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('verifyXrplMint', () => {
  it('returns the on-chain NFTokenID and issuer for a valid mint by a linked wallet', async () => {
    fetchMock.mockResolvedValue(rpcResponse(validMint))
    await expect(verify()).resolves.toEqual({ nftokenId: NFTOKEN_ID, issuer: MINTER, uriHex: URI_HEX })
  })

  it('rejects a mint whose on-chain URI does not match the asset (binding check)', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ ...validMint, URI: '6F7468657200' }))
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_URI_MISMATCH' })
  })

  it('rejects a mint whose taxon or royalty does not match the intent', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ ...validMint, TransferFee: 9999 }))
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_PARAMS_MISMATCH' })
  })

  it('uses the explicit Issuer field when minting on behalf of another account', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ ...validMint, Issuer: 'rIssuerAccount' }))
    await expect(verify()).resolves.toMatchObject({ issuer: 'rIssuerAccount' })
  })

  it('rejects a mint signed by an account that is not one of the linked wallets', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ ...validMint, Account: 'rSomeoneElse' }))
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_WRONG_MINTER' })
  })

  it('rejects a non-NFTokenMint transaction', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ ...validMint, TransactionType: 'Payment' }))
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_NOT_MINT' })
  })

  it('rejects a not-yet-validated transaction', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ ...validMint, validated: false }))
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_NOT_VALIDATED' })
  })

  it('rejects a mint that failed on-ledger', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ ...validMint, meta: { TransactionResult: 'tecNO_ENTRY', nftoken_id: NFTOKEN_ID } }))
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_FAILED' })
  })

  it('fails when the ledger metadata carries no nftoken_id', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ ...validMint, meta: { TransactionResult: 'tesSUCCESS' } }))
    await expect(verify()).rejects.toMatchObject({ status: 502, code: 'MINT_ID_MISSING' })
  })

  it('maps an unknown transaction to 404 TX_NOT_FOUND', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ error: 'txnNotFound' }))
    await expect(verify()).rejects.toMatchObject({ status: 404, code: 'TX_NOT_FOUND' })
  })

  it('maps a network failure to 502 TX_LOOKUP_FAILED', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    await expect(verify()).rejects.toMatchObject({ status: 502, code: 'TX_LOOKUP_FAILED' })
  })

  it('polls until the submitted mint is validated (wallets return the hash pre-consensus)', async () => {
    vi.stubEnv('XRPL_TX_POLL_ATTEMPTS', '3')
    fetchMock
      .mockResolvedValueOnce(rpcResponse({ error: 'txnNotFound' }))
      .mockResolvedValueOnce(rpcResponse({ ...validMint, validated: false }))
      .mockResolvedValueOnce(rpcResponse(validMint))
    await expect(verify()).resolves.toMatchObject({ nftokenId: NFTOKEN_ID })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('retries transient network failures during polling', async () => {
    vi.stubEnv('XRPL_TX_POLL_ATTEMPTS', '2')
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(rpcResponse(validMint))
    await expect(verify()).resolves.toMatchObject({ nftokenId: NFTOKEN_ID })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry a definitive RPC error', async () => {
    vi.stubEnv('XRPL_TX_POLL_ATTEMPTS', '5')
    fetchMock.mockResolvedValue(rpcResponse({ error: 'internal' }))
    await expect(verify()).rejects.toMatchObject({ status: 502, code: 'TX_LOOKUP_FAILED' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports TX_NOT_FOUND when the transaction never appears within the polling budget', async () => {
    vi.stubEnv('XRPL_TX_POLL_ATTEMPTS', '3')
    fetchMock.mockResolvedValue(rpcResponse({ error: 'txnNotFound' }))
    await expect(verify()).rejects.toMatchObject({ status: 404, code: 'TX_NOT_FOUND' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
