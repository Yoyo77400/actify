// Shared "rarity" display for a listing's distributionMode - used on the
// asset detail page and on every card that lists assets (marketplace,
// profile, artist page, search, collections), so scarcity is visible without
// having to click into the asset.

const DISTRIBUTION_LABELS: Record<string, string> = {
  unlimited: 'Illimité',
  limited: 'Limité',
  unique: 'Pièce unique',
}

export function distributionLabel(mode: string): string {
  return DISTRIBUTION_LABELS[mode] ?? mode
}

export interface DistributionCounts {
  distributionMode: string
  maxDownloads: number | null
  salesCount: number
}

// null for "unlimited" - there's no cap to report, so there's nothing to show.
export function distributionText(item: DistributionCounts): string | null {
  if (item.distributionMode === 'unlimited') return null
  if (item.distributionMode === 'unique') return item.salesCount > 0 ? 'Vendu' : 'Disponible'
  if (item.maxDownloads == null) return null
  const remaining = Math.max(0, item.maxDownloads - item.salesCount)
  return `${item.salesCount}/${item.maxDownloads} vendus · ${remaining} restant${remaining === 1 ? '' : 's'}`
}
