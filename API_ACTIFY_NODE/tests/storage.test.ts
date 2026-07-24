import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

// storage.ts reads UPLOADS_DIR at import time (creates the dir synchronously),
// so it must be set before the dynamic import below — same pattern as the e2e
// bootstrap setting DATABASE_URL before importing app.
let sniffImageMime: typeof import('../services/storage').sniffImageMime
let uploadsDir: string

beforeAll(async () => {
  uploadsDir = mkdtempSync(join(tmpdir(), 'actify-uploads-test-'))
  process.env.UPLOADS_DIR = uploadsDir
  ;({ sniffImageMime } = await import('../services/storage'))
})

function writeTemp(name: string, bytes: Buffer): string {
  const path = join(uploadsDir, name)
  writeFileSync(path, bytes)
  return path
}

describe('sniffImageMime', () => {
  it('recognizes a real PNG by its magic bytes', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    expect(sniffImageMime(writeTemp('real.png', png))).toBe('image/png')
  })

  it('recognizes a real JPEG by its magic bytes', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
    expect(sniffImageMime(writeTemp('real.jpg', jpeg))).toBe('image/jpeg')
  })

  it('recognizes a real GIF by its magic bytes', () => {
    const gif = Buffer.from('GIF89a-rest-of-file', 'ascii')
    expect(sniffImageMime(writeTemp('real.gif', gif))).toBe('image/gif')
  })

  it('recognizes a real WEBP by its magic bytes', () => {
    const webp = Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP', 'ascii')])
    expect(sniffImageMime(writeTemp('real.webp', webp))).toBe('image/webp')
  })

  it('recognizes a real AVIF by its magic bytes', () => {
    const avif = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from('ftyp', 'ascii'), Buffer.from('avif', 'ascii')])
    expect(sniffImageMime(writeTemp('real.avif', avif))).toBe('image/avif')
  })

  it('returns null for an HTML/script payload disguised with a .png extension (the exploit case)', () => {
    const html = Buffer.from('<html><body><script>alert(document.cookie)</script></body></html>', 'utf8')
    expect(sniffImageMime(writeTemp('fake.png', html))).toBeNull()
  })

  it('returns null for an SVG payload (XML, never safe to render inline)', () => {
    const svg = Buffer.from('<svg onload="alert(1)"></svg>', 'utf8')
    expect(sniffImageMime(writeTemp('fake.svg', svg))).toBeNull()
  })

  it('returns null for an arbitrary binary (e.g. a zip asset)', () => {
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4])
    expect(sniffImageMime(writeTemp('asset.zip', zip))).toBeNull()
  })

  it('returns null for an empty file instead of throwing', () => {
    expect(sniffImageMime(writeTemp('empty.png', Buffer.alloc(0)))).toBeNull()
  })
})
