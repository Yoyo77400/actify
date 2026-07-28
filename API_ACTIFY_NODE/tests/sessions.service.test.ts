import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/prisma', () => ({
  prisma: {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

import { prisma } from '../services/prisma'
import { verifyToken } from '../utils/jwt'
import {
  findUsableSession,
  listUserSessions,
  openSession,
  revokeAllUserSessions,
  revokeUserSession,
} from '../services/sessions.service'

const create = vi.mocked(prisma.session.create)
const findUnique = vi.mocked(prisma.session.findUnique)
const findMany = vi.mocked(prisma.session.findMany)
const updateMany = vi.mocked(prisma.session.updateMany)

const USER_ID = 'user-1'
const SESSION_ID = 'session-1'

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    userId: USER_ID,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    user: { id: USER_ID, deletedAt: null },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  create.mockResolvedValue({ id: SESSION_ID } as never)
  updateMany.mockResolvedValue({ count: 1 } as never)
})

describe('openSession', () => {
  it('binds both tokens to the created session', async () => {
    const tokens = await openSession(USER_ID)

    // Without this link nothing could be revoked: the token would stand alone.
    expect(verifyToken(tokens.accessToken)?.sid).toBe(SESSION_ID)
    expect(verifyToken(tokens.refreshToken)?.sid).toBe(SESSION_ID)
    expect(verifyToken(tokens.accessToken)?.sub).toBe(USER_ID)
  })

  it('carries the mfa level onto the tokens', async () => {
    const tokens = await openSession(USER_ID, { mfa: true })
    expect(verifyToken(tokens.accessToken)?.mfa).toBe(true)
  })

  it('truncates the device fingerprint (attacker-controlled, display only)', async () => {
    await openSession(USER_ID, { userAgent: 'u'.repeat(500), ip: 'i'.repeat(200) })

    const data = create.mock.calls[0]![0]!.data as { userAgent: string; ip: string }
    expect(data.userAgent).toHaveLength(255)
    expect(data.ip).toHaveLength(64)
  })
})

// These three are the whole point of the table: each one must make a token
// stop working *now*, not when it eventually expires.
describe('findUsableSession', () => {
  it('accepts a live session', async () => {
    findUnique.mockResolvedValue(session() as never)
    await expect(findUsableSession(SESSION_ID)).resolves.not.toBeNull()
  })

  it('refuses a revoked session', async () => {
    findUnique.mockResolvedValue(session({ revokedAt: new Date() }) as never)
    await expect(findUsableSession(SESSION_ID)).resolves.toBeNull()
  })

  it('refuses an expired session', async () => {
    findUnique.mockResolvedValue(session({ expiresAt: new Date(Date.now() - 1) }) as never)
    await expect(findUsableSession(SESSION_ID)).resolves.toBeNull()
  })

  it('refuses a session whose user was erased', async () => {
    findUnique.mockResolvedValue(session({ user: { id: USER_ID, deletedAt: new Date() } }) as never)
    await expect(findUsableSession(SESSION_ID)).resolves.toBeNull()
  })
})

describe('revokeUserSession', () => {
  it('hides another user\'s session behind a 404 rather than a 403', async () => {
    // A distinct status would confirm the id exists, letting anyone probe for
    // valid session ids.
    findUnique.mockResolvedValue(session({ userId: 'someone-else' }) as never)

    await expect(revokeUserSession(USER_ID, SESSION_ID)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('revokes a session the caller owns', async () => {
    findUnique.mockResolvedValue(session() as never)
    await expect(revokeUserSession(USER_ID, SESSION_ID)).resolves.toEqual({ revoked: true })
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: SESSION_ID, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
  })
})

describe('revokeAllUserSessions', () => {
  it('revokes every live session of that user only', async () => {
    updateMany.mockResolvedValue({ count: 3 } as never)

    await expect(revokeAllUserSessions(USER_ID)).resolves.toEqual({ revoked: 3 })
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
  })
})

describe('listUserSessions', () => {
  it('flags the caller\'s current device and omits revoked ones', async () => {
    findMany.mockResolvedValue([
      { ...session(), createdAt: new Date(), lastUsedAt: new Date(), userAgent: 'Firefox', ip: '127.0.0.1' },
      { ...session({ id: 'session-2' }), createdAt: new Date(), lastUsedAt: new Date(), userAgent: null, ip: null },
    ] as never)

    const list = await listUserSessions(USER_ID, SESSION_ID)

    expect(list.map(s => s.current)).toEqual([true, false])
    // Revoked/expired rows are filtered in the query, not after the fact.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID, revokedAt: null }),
      }),
    )
  })
})
