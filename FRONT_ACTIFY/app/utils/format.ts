/** Truncated form of an XRPL address for display (e.g. "rNyri…LnpS"). */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
