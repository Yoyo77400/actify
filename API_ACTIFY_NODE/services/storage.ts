import { createReadStream, existsSync, mkdirSync } from 'node:fs'
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
