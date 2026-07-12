import { describe, expect, it } from 'vitest'
import { extractBearerToken, signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt'

describe('jwt utils', () => {
  it('signs an access token whose sub is the user id', () => {
    const payload = verifyToken(signAccessToken('user-1'))
    expect(payload?.sub).toBe('user-1')
    expect(payload?.type).toBeUndefined()
  })

  it('marks refresh tokens with type refresh', () => {
    const payload = verifyToken(signRefreshToken('user-1'))
    expect(payload?.sub).toBe('user-1')
    expect(payload?.type).toBe('refresh')
  })

  it('returns null for a tampered token', () => {
    const token = signAccessToken('user-1')
    expect(verifyToken(token.slice(0, -2) + 'xx')).toBeNull()
  })

  it('extracts bearer tokens and rejects other schemes', () => {
    expect(extractBearerToken('Bearer abc')).toBe('abc')
    expect(extractBearerToken('Basic abc')).toBeNull()
    expect(extractBearerToken(undefined)).toBeNull()
  })
})
