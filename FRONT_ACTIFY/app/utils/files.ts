// Public URL of a file stored by the API (thumbnails, display images).
// Same-origin /api path — proxied to the backend in dev and prod.
export function fileUrl(key: string | null | undefined): string | null {
  return key ? `/api/v1/files/${key}` : null
}

// Thumbnail with a deterministic placeholder fallback for cards/detail.
export function assetImage(thumbnailCid: string | null | undefined, seed: string): string {
  return fileUrl(thumbnailCid) ?? `https://picsum.photos/seed/${seed}/600/400`
}
