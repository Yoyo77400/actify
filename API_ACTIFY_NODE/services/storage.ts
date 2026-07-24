import { closeSync, createReadStream, existsSync, mkdirSync, openSync, readSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'

// Local file storage: uploaded asset files live on disk (a Docker volume in
// prod). Dev runs the API on the host, so this defaults to ./uploads.
const UPLOADS_DIR = resolve(process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads'))
const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB
const IMAGE_MIME = /^image\/(png|jpe?g|webp|gif|avif)$/

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true })
}

// Opaque, unguessable storage keys — the main-file key never leaves the server
// (serializeListing omits it), so knowing a key can't be used to bypass the
// download entitlement.
function makeKey(originalName: string): string {
  const ext = extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '')
  return `${randomUUID()}${ext}`
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => cb(null, makeKey(file.originalname)),
})

/** Multer middleware for a single required file field, size-capped. */
export const uploadSingle = (field: string) =>
  multer({ storage: diskStorage, limits: { fileSize: MAX_FILE_BYTES } }).single(field)

export const uploadSingleImage = (field: string) =>
  multer({
    storage: diskStorage,
    limits: { fileSize: MAX_FILE_BYTES },
    fileFilter: (_req, file, cb) => cb(null, IMAGE_MIME.test(file.mimetype)),
  }).single(field)

/** Absolute path of a stored key, or null if it escapes the uploads dir / is absent. */
export function resolveStoredPath(key: string): string | null {
  const full = resolve(UPLOADS_DIR, key)
  if (!full.startsWith(UPLOADS_DIR)) return null // path-traversal guard
  return existsSync(full) ? full : null
}

export function streamStored(key: string) {
  const path = resolveStoredPath(key)
  return path ? createReadStream(path) : null
}

const SNIFF_BYTES = 16

// Upload accepts ANY file type — assets are arbitrary digital goods (zip,
// psd, exe, whatever) and that's by design, unrestricted here. This only
// governs GET /files/:key (the public, unauthenticated thumbnail route): the
// client-declared mimetype/extension can't be trusted for what a browser is
// told to do with the bytes, so this sniffs the handful of raster formats
// ever rendered inline from their real magic bytes. Anything that doesn't
// match — including a file mislabeled .png that's actually HTML/SVG/script —
// is served as a forced download instead (see uploads.controller.serveFile),
// never inline, so it can never execute in a browser. The file itself is
// never blocked or altered: a buyer can still download and run it locally.
// SVG is deliberately excluded from the safe set: it's XML and can carry
// <script>, so it's never safe to render inline even as an "image" format.
const IMAGE_SIGNATURES: Array<{ mime: string; matches: (head: Buffer) => boolean }> = [
  {
    mime: 'image/png',
    matches: (head) => head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { mime: 'image/jpeg', matches: (head) => head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff },
  {
    mime: 'image/gif',
    matches: (head) => ['GIF87a', 'GIF89a'].includes(head.subarray(0, 6).toString('ascii')),
  },
  {
    mime: 'image/webp',
    matches: (head) =>
      head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    mime: 'image/avif',
    matches: (head) =>
      head.subarray(4, 8).toString('ascii') === 'ftyp' && ['avif', 'avis'].includes(head.subarray(8, 12).toString('ascii')),
  },
]

/**
 * Verifies the file at `path` is a genuine raster image by its magic bytes
 * and returns its real MIME type, or null if it doesn't match any known-safe
 * format. Never trust the caller's extension/declared mimetype for this.
 */
export function sniffImageMime(path: string): string | null {
  const fd = openSync(path, 'r')
  try {
    const buf = Buffer.alloc(SNIFF_BYTES)
    const bytesRead = readSync(fd, buf, 0, SNIFF_BYTES, 0)
    const head = bytesRead === SNIFF_BYTES ? buf : buf.subarray(0, bytesRead)
    return IMAGE_SIGNATURES.find((sig) => sig.matches(head))?.mime ?? null
  } finally {
    closeSync(fd)
  }
}
