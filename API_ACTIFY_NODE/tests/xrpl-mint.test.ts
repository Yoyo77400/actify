import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyXrplMint } from '../services/chains/xrpl-mint'

const MINTER = 'rMinterAddress'
const TX_HASH = 'A'.repeat(64)
const NFTOKEN_ID = '000800001234567890ABCDEF'

const validMint = {
  validated: true,
  TransactionType: 'NFTokenMint',
  Account: MINTER,
  meta: { TransactionResult: 'tesSUCCESS', nftoken_id: NFTOKEN_ID },
}

function rpcResponse(result: unknown) {
  return { ok: true, json: async () => ({ result }) }
}

const fetchMock = vi.fn()

function verify(minters = [MINTER]) {
  return verifyXrplMint({ txHash: TX_HASH, minters })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('verifyXrplMint', () => {
  it('returns the on-chain NFTokenID and issuer for a valid mint by a linked wallet', async () => {
    fetchMock.mockResolvedValue(rpcResponse(validMint))
    await expect(verify()).resolves.toEqual({ nftokenId: NFTOKEN_ID, issuer: MINTER })
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
})
