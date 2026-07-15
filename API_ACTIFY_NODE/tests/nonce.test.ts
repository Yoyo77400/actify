import { describe, it, expect } from 'vitest'
import { generateNonce } from '../utils/nonce'

describe('nonce utils', () => {
  it('generates a string of 48 hex characters', () => {
    const nonce = generateNonce()
    expect(typeof nonce).toBe('string')
    expect(nonce).toHaveLength(48)
    expect(/^[0-9a-f]+$/.test(nonce)).toBe(true)
  })

  it('generates unique nonces', () => {
    const nonce1 = generateNonce()
    const nonce2 = generateNonce()
    expect(nonce1).not.toBe(nonce2)
  })
})
