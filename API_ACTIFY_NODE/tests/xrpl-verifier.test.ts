import { describe, expect, it } from 'vitest'
import { deriveAddress, deriveKeypair, generateSeed, sign } from 'ripple-keypairs'
import { xrplVerifier } from '../services/chains/xrpl'

function makeSignedChallenge() {
  const pair = deriveKeypair(generateSeed())
  const address = deriveAddress(pair.publicKey)
  const message = `Actify wallet verification\naddress: ${address}\nnonce: abc123`
  const messageHex = Buffer.from(message, 'utf8').toString('hex')
  const signature = sign(messageHex, pair.privateKey)
  return { pair, address, message, signature }
}

describe('xrplVerifier', () => {
  it('accepts a valid signature from the address owner', () => {
    const { pair, address, message, signature } = makeSignedChallenge()
    expect(xrplVerifier.verify({ address, publicKey: pair.publicKey, message, signature })).toBe(true)
  })

  it('rejects when the public key does not derive the claimed address', () => {
    const { pair, message, signature } = makeSignedChallenge()
    expect(
      xrplVerifier.verify({ address: 'rrrrrrrrrrrrrrrrrrrrBZbvji', publicKey: pair.publicKey, message, signature }),
    ).toBe(false)
  })

  it('rejects a tampered message', () => {
    const { pair, address, message, signature } = makeSignedChallenge()
    expect(xrplVerifier.verify({ address, publicKey: pair.publicKey, message: message + 'x', signature })).toBe(false)
  })

  it('rejects garbage public keys without throwing', () => {
    const { address, message, signature } = makeSignedChallenge()
    expect(xrplVerifier.verify({ address, publicKey: 'deadbeef', message, signature })).toBe(false)
  })
})
