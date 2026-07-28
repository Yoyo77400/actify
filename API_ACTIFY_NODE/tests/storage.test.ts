import { mkdtempSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'

// sharp garde les fichiers ouverts dans son cache interne ; sous Windows cela
// empêche compressThumbnail de réécrire l'image en place pendant les tests.
// Désactivé ici uniquement : en production l'API tourne sous Linux (Docker).
sharp.cache(false)

// storage.ts reads UPLOADS_DIR at import time (creates the dir synchronously),
// so it must be set before the dynamic import below — same pattern as the e2e
// bootstrap setting DATABASE_URL before importing app.
let sniffImageMime: typeof import('../services/storage').sniffImageMime
let resolveStoredPath: typeof import('../services/storage').resolveStoredPath
let streamStored: typeof import('../services/storage').streamStored
let compressThumbnail: typeof import('../services/storage').compressThumbnail
let uploadsDir: string

beforeAll(async () => {
  uploadsDir = mkdtempSync(join(tmpdir(), 'actify-uploads-test-'))
  process.env.UPLOADS_DIR = uploadsDir
  ;({ sniffImageMime, resolveStoredPath, streamStored, compressThumbnail } = await import('../services/storage'))
})

function writeTemp(name: string, bytes: Buffer): string {
  const path = join(uploadsDir, name)
  writeFileSync(path, bytes)
  return path
}

// Bruit déterministe : une image incompressible, pour pousser le compresseur
// dans ses retranchements sans dépendre du hasard d'un run à l'autre.
function noisyPixels(width: number, height: number, channels: 3 = 3): Buffer {
  const buffer = Buffer.allocUnsafe(width * height * channels)
  let state = 123456789
  for (let i = 0; i < buffer.length; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    buffer[i] = state % 256
  }
  return buffer
}

function rawImage(width: number, height: number) {
  return sharp(noisyPixels(width, height), { raw: { width, height, channels: 3 } })
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

  it('returns null for a file shorter than the signature window (robustesse)', () => {
    // Moins de 16 octets : la lecture est tronquée, aucune signature ne matche.
    expect(sniffImageMime(writeTemp('tiny.png', Buffer.from([0x89, 0x50])))).toBeNull()
  })
})

describe('resolveStoredPath : garde contre la traversée de chemin', () => {
  it('résout une clé de stockage normale vers un fichier existant', () => {
    writeTemp('normal.bin', Buffer.from([1, 2, 3]))

    expect(resolveStoredPath('normal.bin')).toBe(join(uploadsDir, 'normal.bin'))
  })

  it('renvoie null pour une clé inexistante', () => {
    expect(resolveStoredPath('jamais-uploade.bin')).toBeNull()
  })

  it('refuse de sortir du dossier d\'uploads avec ../', () => {
    // Le fichier existe réellement un cran au-dessus : seul le garde empêche
    // de le servir.
    const outside = join(dirname(uploadsDir), 'secret-hors-uploads.txt')
    writeFileSync(outside, 'contenu confidentiel')

    expect(resolveStoredPath('../secret-hors-uploads.txt')).toBeNull()
  })

  it('refuse une remontée multiple', () => {
    expect(resolveStoredPath('../../../../etc/passwd')).toBeNull()
  })

  it('refuse un chemin absolu fourni comme clé', () => {
    expect(resolveStoredPath(process.execPath)).toBeNull()
  })
})

describe('streamStored', () => {
  it('ouvre un flux de lecture pour un fichier stocké', async () => {
    writeTemp('streamable.bin', Buffer.from('bonjour'))

    const stream = streamStored('streamable.bin')

    expect(stream).not.toBeNull()
    const chunks: Buffer[] = []
    for await (const chunk of stream!) chunks.push(chunk as Buffer)
    expect(Buffer.concat(chunks).toString()).toBe('bonjour')
  })

  it('renvoie null (et ne lève pas) pour un fichier absent', () => {
    expect(streamStored('absent.bin')).toBeNull()
  })

  it('renvoie null pour une tentative de traversée', () => {
    expect(streamStored('../../etc/hosts')).toBeNull()
  })
})

describe('compressThumbnail : bornes de redimensionnement', () => {
  it('ramène une grande image dans la limite de 800 px', async () => {
    const path = writeTemp('grande.png', await rawImage(2000, 1200).png().toBuffer())

    await compressThumbnail(path)

    const { width, height } = await sharp(path).metadata()
    expect(Math.max(width!, height!)).toBeLessThanOrEqual(800)
    // Le ratio est conservé (fit: inside).
    expect(width! / height!).toBeCloseTo(2000 / 1200, 1)
  })

  it('n\'agrandit PAS une image déjà plus petite que la limite', async () => {
    const path = writeTemp('petite.png', await rawImage(100, 80).png().toBuffer())

    await compressThumbnail(path)

    const { width, height } = await sharp(path).metadata()
    expect(width).toBe(100)
    expect(height).toBe(80)
  })

  it('laisse intacte une image pile à la limite de 800 px', async () => {
    const path = writeTemp('pile-800.png', await rawImage(800, 800).png().toBuffer())

    await compressThumbnail(path)

    const { width } = await sharp(path).metadata()
    expect(width).toBe(800)
  })
})

describe('compressThumbnail : plafond de poids (conditions dégradées)', () => {
  it('maintient une miniature bruitée de 3000 px sous le plafond de 1 Mo', async () => {
    const path = writeTemp('bruit.png', await rawImage(3000, 3000).png().toBuffer())

    await compressThumbnail(path)

    // Le plafond est le contrat : si la première passe dépasse, l'échelle de
    // repli (800/50 → 600/45 → 450/35 → 300/30) reprend la main.
    expect(statSync(path).size).toBeLessThanOrEqual(1024 * 1024)
  }, 30_000)

  it('réduit effectivement le poids du fichier d\'origine', async () => {
    const original = await rawImage(2500, 2500).png().toBuffer()
    const path = writeTemp('lourde.png', original)

    await compressThumbnail(path)

    expect(statSync(path).size).toBeLessThan(original.byteLength)
  }, 30_000)
})

describe('compressThumbnail : conservation du format', () => {
  it('garde le PNG en PNG', async () => {
    const path = writeTemp('format.png', await rawImage(900, 900).png().toBuffer())

    await compressThumbnail(path)

    expect((await sharp(path).metadata()).format).toBe('png')
  })

  it('garde le WebP en WebP', async () => {
    const path = writeTemp('format.webp', await rawImage(900, 900).webp().toBuffer())

    await compressThumbnail(path)

    expect((await sharp(path).metadata()).format).toBe('webp')
  })

  it('garde le JPEG en JPEG', async () => {
    const path = writeTemp('format.jpg', await rawImage(900, 900).jpeg().toBuffer())

    await compressThumbnail(path)

    expect((await sharp(path).metadata()).format).toBe('jpeg')
  })
})

describe('compressThumbnail : entrée invalide', () => {
  it('lève pour un fichier qui n\'est pas une image décodable', async () => {
    const path = writeTemp('pas-une-image.png', Buffer.from('<html>je ne suis pas une image</html>', 'utf8'))

    // L'appelant doit traiter ça comme une erreur de validation (400), pas
    // comme une panne serveur.
    await expect(compressThumbnail(path)).rejects.toThrow()
  })

  it('lève pour un fichier vide', async () => {
    const path = writeTemp('vide-thumb.png', Buffer.alloc(0))

    await expect(compressThumbnail(path)).rejects.toThrow()
  })
})
