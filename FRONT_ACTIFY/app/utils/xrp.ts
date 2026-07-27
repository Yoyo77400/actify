const DROPS_DECIMALS = 6

/**
 * Converts an XRP amount to integer drops (1 XRP = 1e6 drops).
 *
 * String arithmetic, not `amount * 1e6`: this value is what the wallet is
 * asked to send, so binary float drift is not acceptable. Accepts the decimal
 * strings the API returns for Prisma Decimal prices.
 *
 * @param amount positive XRP amount with at most 6 decimals, e.g. `"4"`, `"0.25"`
 * @returns the equivalent drops as a decimal string, e.g. `"4000000"`
 * @throws when the amount is not a positive value expressible in drops
 */
export function xrpToDrops(amount: string | number): string {
  const text = String(amount).trim()
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(text)
  if (!match) {
    throw new Error(`Montant XRP invalide : ${text}`)
  }

  const drops = BigInt(match[1]! + (match[2] ?? '').padEnd(DROPS_DECIMALS, '0'))
  if (drops <= 0n) {
    throw new Error(`Montant XRP invalide : ${text}`)
  }
  return drops.toString()
}
