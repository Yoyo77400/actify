import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyXrplPayment } from '../services/chains/xrpl-payment'

const DESTINATION = 'rSellerAddress'
const DESTINATION_TAG = 42
const TX_HASH = 'ABC123'
const FIVE_XRP_IN_DROPS = '5000000'

const validPayment = {
  validated: true,
  TransactionType: 'Payment',
  Destination: DESTINATION,
  DestinationTag: DESTINATION_TAG,
  meta: { TransactionResult: 'tesSUCCESS', delivered_amount: FIVE_XRP_IN_DROPS },
}

function rpcResponse(result: unknown) {
  return { ok: true, json: async () => ({ result }) }
}

const fetchMock = vi.fn()

function verify(minAmountXrp = 5) {
  return verifyXrplPayment({ txHash: TX_HASH, destination: DESTINATION, destinationTag: DESTINATION_TAG, minAmountXrp })
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

describe('verifyXrplPayment', () => {
  it('resolves for a validated successful payment to the right address and tag', async () => {
    fetchMock.mockResolvedValue(rpcResponse(validPayment))
    await expect(verify()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('https://s.altnet.rippletest.net:51234/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'tx', params: [{ transaction: TX_HASH, binary: false }] }),
    })
  })

  it('uses XRPL_RPC_URL when set', async () => {
    vi.stubEnv('XRPL_RPC_URL', 'http://localhost:5005/')
    fetchMock.mockResolvedValue(rpcResponse(validPayment))
    await verify()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5005/', expect.anything())
  })

  it('reads the legacy meta.DeliveredAmount when delivered_amount is absent', async () => {
    fetchMock.mockResolvedValue(
      rpcResponse({
        ...validPayment,
        meta: { TransactionResult: 'tesSUCCESS', DeliveredAmount: FIVE_XRP_IN_DROPS },
      }),
    )
    await expect(verify()).resolves.toBeUndefined()
  })

  it('rejects a payment carrying the wrong DestinationTag (bound to another order)', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ ...validPayment, DestinationTag: 999 }))
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_WRONG_TAG' })
  })

  it('rejects a payment with no DestinationTag', async () => {
    const { DestinationTag: _tag, ...noTag } = validPayment
    fetchMock.mockResolvedValue(rpcResponse(noTag))
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_WRONG_TAG' })
  })

  it('rejects a transaction not yet validated', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ ...validPayment, validated: false }))
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_NOT_VALIDATED' })
  })

  it('rejects a non-Payment transaction', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ ...validPayment, TransactionType: 'OfferCreate' }))
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_NOT_PAYMENT' })
  })

  it('rejects a payment to another destination', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ ...validPayment, Destination: 'rSomeoneElse' }))
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_WRONG_DESTINATION' })
  })

  it('rejects a transaction that failed on-ledger', async () => {
    fetchMock.mockResolvedValue(
      rpcResponse({
        ...validPayment,
        meta: { TransactionResult: 'tecUNFUNDED_PAYMENT', delivered_amount: FIVE_XRP_IN_DROPS },
      }),
    )
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_FAILED' })
  })

  it('rejects when the delivered amount is below the expected price', async () => {
    fetchMock.mockResolvedValue(
      rpcResponse({ ...validPayment, meta: { TransactionResult: 'tesSUCCESS', delivered_amount: '4999999' } }),
    )
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_AMOUNT_TOO_LOW' })
  })

  it('rejects an issued-currency (non-XRP) delivered amount', async () => {
    fetchMock.mockResolvedValue(
      rpcResponse({
        ...validPayment,
        meta: { TransactionResult: 'tesSUCCESS', delivered_amount: { currency: 'USD', value: '5' } },
      }),
    )
    await expect(verify()).rejects.toMatchObject({ status: 400, code: 'TX_AMOUNT_TOO_LOW' })
  })

  it('rejects an unknown transaction with 404 TX_NOT_FOUND', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ error: 'txnNotFound' }))
    await expect(verify()).rejects.toMatchObject({ status: 404, code: 'TX_NOT_FOUND' })
  })

  it('rejects other JSON-RPC errors with 502 TX_LOOKUP_FAILED', async () => {
    fetchMock.mockResolvedValue(rpcResponse({ error: 'internal' }))
    await expect(verify()).rejects.toMatchObject({ status: 502, code: 'TX_LOOKUP_FAILED' })
  })

  it('maps an HTTP error from the RPC endpoint to 502 TX_LOOKUP_FAILED', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 })
    await expect(verify()).rejects.toMatchObject({ status: 502, code: 'TX_LOOKUP_FAILED' })
  })

  it('maps a network failure (fetch rejects) to 502 TX_LOOKUP_FAILED', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    await expect(verify()).rejects.toMatchObject({ status: 502, code: 'TX_LOOKUP_FAILED' })
  })

  it('maps a malformed JSON body to 502 TX_LOOKUP_FAILED', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError('bad json') } })
    await expect(verify()).rejects.toMatchObject({ status: 502, code: 'TX_LOOKUP_FAILED' })
  })

  it('polls until the submitted payment is validated (hash pasted right after submit)', async () => {
    vi.stubEnv('XRPL_TX_POLL_ATTEMPTS', '3')
    fetchMock
      .mockResolvedValueOnce(rpcResponse({ error: 'txnNotFound' }))
      .mockResolvedValueOnce(rpcResponse({ ...validPayment, validated: false }))
      .mockResolvedValueOnce(rpcResponse(validPayment))
    await expect(verify()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
