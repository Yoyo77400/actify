// Public URL of a file stored by the API (thumbnails, display images).
// Same-origin /api path — proxied to the backend in dev and prod.
export function fileUrl(key: string | null | undefined): string | null {
  return key ? `/api/v1/files/${key}` : null
}

// Local, deterministic placeholder tile: a muted gradient + image glyph,
// hue-varied by seed so cards stay distinguishable. No third-party service —
// a random stock photo misrepresents what the asset actually is.
function placeholderImage(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  const hue = hash % 360
  const svg
    = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" stop-color="hsl(${hue} 32% 20%)"/>`
    + `<stop offset="1" stop-color="hsl(${(hue + 45) % 360} 30% 11%)"/>`
    + `</linearGradient></defs>`
    + `<rect width="600" height="400" fill="url(#g)"/>`
    + `<g fill="none" stroke="hsl(${hue} 28% 46%)" stroke-width="9" opacity="0.5" stroke-linecap="round" stroke-linejoin="round">`
    + `<rect x="215" y="135" width="170" height="130" rx="14"/>`
    + `<path d="M240 235 L285 192 L318 222 L343 200 L370 235"/>`
    + `</g>`
    + `<circle cx="262" cy="172" r="12" fill="hsl(${hue} 28% 46%)" opacity="0.5"/>`
    + `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// Thumbnail with a deterministic local fallback for cards/detail.
export function assetImage(thumbnailCid: string | null | undefined, seed: string): string {
  return fileUrl(thumbnailCid) ?? placeholderImage(seed)
}
