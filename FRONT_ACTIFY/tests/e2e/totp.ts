import { createHmac } from 'node:crypto'

/**
 * Minimal RFC 6238 TOTP generator, used to produce codes the backend's
 * @otplib/preset-v11 accepts (SHA-1, 30s step, 6 digits — its defaults).
 *
 * Written here rather than pulling otplib into the front-end's devDependencies:
 * the test needs to act as the user's authenticator app, and reusing the
 * server's own library would let a bug in that library cancel itself out on
 * both sides.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(secret: string): Buffer {
  const clean = secret.replace(/=+$/, '').toUpperCase()
  let bits = ''
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) throw new Error(`invalid base32 character: ${char}`)
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

export function generateTotp(secret: string, at: number = Date.now()): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)))

  const digest = createHmac('sha1', base32Decode(secret)).update(counter).digest()
  const offset = digest[digest.length - 1]! & 0x0f
  const binary = digest.readUInt32BE(offset) & 0x7fffffff

  return String(binary % 1_000_000).padStart(6, '0')
}
