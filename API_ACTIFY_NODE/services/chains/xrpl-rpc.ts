import { AppError } from '../../utils/http'

const DEFAULT_XRPL_RPC_URL = 'https://s.altnet.rippletest.net:51234/'
const TXN_NOT_FOUND_ERROR = 'txnNotFound'
// Wallets return the tx hash at submission time, ~3-5s before the transaction
// lands in a validated ledger. 8 attempts spaced 1.5s apart cover several
// ledger closes without exceeding the frontend's 30s confirm timeout.
const DEFAULT_POLL_ATTEMPTS = 8
const DEFAULT_POLL_INTERVAL_MS = 1500
// A hung RPC call must not eat the whole polling budget, and the poll as a
// whole must resolve into a proper HTTP error before the frontend gives up
// on the confirm request (30s): bound each attempt and the total wait.
const RPC_ATTEMPT_TIMEOUT_MS = 5000
const POLL_DEADLINE_MS = 20_000

/** Union of the `tx` response fields Actify checks across Payment and NFTokenMint. */
export interface XrplTx {
  error?: string
  validated?: boolean
  TransactionType?: string
  Account?: string
  Issuer?: string
  URI?: string
  NFTokenTaxon?: number
  TransferFee?: number
  Destination?: string
  DestinationTag?: number
  meta?: {
    TransactionResult?: string
    nftoken_id?: string
    delivered_amount?: unknown
    DeliveredAmount?: unknown
  }
}

function positiveEnvInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function requestTx(rpcUrl: string, txHash: string): Promise<XrplTx | undefined> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ method: 'tx', params: [{ transaction: txHash, binary: false }] }),
    signal: AbortSignal.timeout(RPC_ATTEMPT_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`XRPL RPC HTTP ${response.status}`)
  }
  return ((await response.json()) as { result?: XrplTx }).result
}

/**
 * Fetches `txHash` on the XRP Ledger (JSON-RPC `tx`) and waits until it is
 * validated by consensus. `txnNotFound`, `validated: false` and network
 * failures are transient right after a wallet submits — they are retried up
 * to XRPL_TX_POLL_ATTEMPTS times, XRPL_TX_POLL_INTERVAL_MS apart. Any other
 * RPC error is definitive and fails immediately. Throws an AppError mapping
 * the final state (TX_NOT_FOUND / TX_NOT_VALIDATED / TX_LOOKUP_FAILED).
 */
export async function fetchValidatedTx(txHash: string): Promise<XrplTx> {
  const rpcUrl = process.env.XRPL_RPC_URL ?? DEFAULT_XRPL_RPC_URL
  const attempts = positiveEnvInt('XRPL_TX_POLL_ATTEMPTS', DEFAULT_POLL_ATTEMPTS)
  const intervalMs = positiveEnvInt('XRPL_TX_POLL_INTERVAL_MS', DEFAULT_POLL_INTERVAL_MS)

  const deadline = Date.now() + POLL_DEADLINE_MS
  let lastOutcome: 'network' | 'not-found' | 'not-validated' | 'rpc-error' = 'network'
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      if (Date.now() + intervalMs >= deadline) break
      await sleep(intervalMs)
    }

    let result: XrplTx | undefined
    try {
      result = await requestTx(rpcUrl, txHash)
    } catch {
      lastOutcome = 'network'
      continue
    }

    if (!result || result.error) {
      if (result?.error === TXN_NOT_FOUND_ERROR) {
        lastOutcome = 'not-found'
        continue
      }
      lastOutcome = 'rpc-error'
      break
    }
    if (result.validated !== true) {
      lastOutcome = 'not-validated'
      continue
    }
    return result
  }

  switch (lastOutcome) {
    case 'not-found':
      throw new AppError(404, 'TX_NOT_FOUND', 'Transaction introuvable sur le ledger XRPL')
    case 'not-validated':
      throw new AppError(400, 'TX_NOT_VALIDATED', 'Transaction non encore validée par le ledger XRPL')
    default:
      throw new AppError(502, 'TX_LOOKUP_FAILED', 'Vérification de la transaction XRPL impossible')
  }
}
