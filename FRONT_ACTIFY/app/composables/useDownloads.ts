import type { DownloadTicket } from '~/types/asset'

export function useDownloads() {
  const api = useApi()
  const config = useRuntimeConfig()

  /**
   * Requests a fresh signed ticket for `assetId` and hands the file to the
   * browser. Throws the API error when the caller isn't entitled (403
   * LICENSE_NOT_FOUND) or the asset's download cap is full (410).
   *
   * The ticket travels in the URL and is single-use by design (short TTL,
   * re-checked server-side), so it is minted per click rather than cached.
   */
  async function download(assetId: string): Promise<void> {
    const ticket = await api.post<DownloadTicket>(`/downloads/${assetId}/request`)

    // Anchor click rather than location.href: the API answers with
    // Content-Disposition: attachment, and this keeps the SPA on the page even
    // if that header ever goes missing.
    const link = document.createElement('a')
    link.href = `${config.public.apiBase}/downloads/token/${ticket.downloadToken}`
    link.download = ''
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return { download }
}
