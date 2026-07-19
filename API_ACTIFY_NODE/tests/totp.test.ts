import { describe, it, expect } from 'vitest'
import { authenticator } from '@otplib/preset-v11'
import { generateTotpSecret, buildOtpauthUri, verifyTotp } from '../utils/totp'

describe('totp utils', () => {
  it('generates a non-empty Base32 secret', () => {
    const secret = generateTotpSecret()
    expect(typeof secret).toBe('string')
    expect(secret.length).toBeGreaterThan(0)
    expect(/^[A-Z2-7]+$/.test(secret)).toBe(true)
  })

  it('generates unique secrets', () => {
    expect(generateTotpSecret()).not.toBe(generateTotpSecret())
  })

  it('builds an otpauth:// URI carrying the issuer and secret', () => {
    const secret = generateTotpSecret()
    const uri = buildOtpauthUri('alice@example.com', secret)
    expect(uri.startsWith('otpauth://totp/')).toBe(true)
    expect(uri).toContain('issuer=Actify')
    expect(uri).toContain(`secret=${secret}`)
  })

  it('accepts the current code for its secret', () => {
    const secret = generateTotpSecret()
    const code = authenticator.generate(secret)
    expect(verifyTotp(code, secret)).toBe(true)
  })

  it('rejects a code generated from a different secret', () => {
    const code = authenticator.generate(generateTotpSecret())
    expect(verifyTotp(code, generateTotpSecret())).toBe(false)
  })

  it('rejects a malformed code without throwing', () => {
    expect(verifyTotp('000000', generateTotpSecret())).toBe(false)
    expect(verifyTotp('not-a-code', generateTotpSecret())).toBe(false)
  })
})
