import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../utils/http'

vi.mock('../services/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '../services/prisma'
import {
  countUnread,
  listMyNotifications,
  markAllAsRead,
  markAsRead,
  notifyUser,
  removeNotification,
} from '../services/notifications.service'

const notificationCreate = vi.mocked(prisma.notification.create)
const notificationFindUnique = vi.mocked(prisma.notification.findUnique)
const notificationFindMany = vi.mocked(prisma.notification.findMany)
const notificationCount = vi.mocked(prisma.notification.count)
const notificationUpdate = vi.mocked(prisma.notification.update)
const notificationUpdateMany = vi.mocked(prisma.notification.updateMany)
const notificationDelete = vi.mocked(prisma.notification.delete)

const pagination = { page: 1, limit: 20, skip: 0 }

const notificationRow = {
  id: 'notif-1',
  userId: 'user-1',
  type: 'order:confirmed',
  message: 'Nouvelle vente confirmée',
  payload: { orderId: 'order-1' },
  readAt: null as Date | null,
  createdAt: new Date('2026-07-20T00:00:00.000Z'),
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('notifyUser', () => {
  it('creates a notification row', async () => {
    notificationCreate.mockResolvedValue(notificationRow as never)

    await notifyUser('user-1', 'order:confirmed', 'Nouvelle vente confirmée', { orderId: 'order-1' })

    expect(notificationCreate).toHaveBeenCalledWith({
      data: { userId: 'user-1', type: 'order:confirmed', message: 'Nouvelle vente confirmée', payload: { orderId: 'order-1' } },
    })
  })

  it('swallows write failures instead of throwing (must never break the triggering action)', async () => {
    notificationCreate.mockRejectedValue(new Error('db down'))
    await expect(notifyUser('user-1', 'order:confirmed', 'x')).resolves.toBeUndefined()
  })
})

describe('listMyNotifications', () => {
  it('returns my notifications newest first with isRead derived from readAt', async () => {
    notificationFindMany.mockResolvedValue([notificationRow] as never)
    notificationCount.mockResolvedValue(1)

    const { items, meta } = await listMyNotifications('user-1', pagination)

    expect(items).toEqual([
      {
        id: 'notif-1',
        type: 'order:confirmed',
        message: 'Nouvelle vente confirmée',
        payload: { orderId: 'order-1' },
        isRead: false,
        readAt: null,
        createdAt: notificationRow.createdAt,
      },
    ])
    expect(meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 })
    expect(notificationFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    })
  })
})

describe('countUnread', () => {
  it('counts unread notifications', async () => {
    notificationCount.mockResolvedValue(3)
    await expect(countUnread('user-1')).resolves.toEqual({ count: 3 })
    expect(notificationCount).toHaveBeenCalledWith({ where: { userId: 'user-1', readAt: null } })
  })
})

describe('markAsRead', () => {
  it('marks an owned notification as read', async () => {
    notificationFindUnique.mockResolvedValue(notificationRow as never)
    notificationUpdate.mockResolvedValue({ ...notificationRow, readAt: new Date('2026-07-21T00:00:00.000Z') } as never)

    const result = await markAsRead('user-1', 'notif-1')

    expect(result.isRead).toBe(true)
    expect(notificationUpdate).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: { readAt: expect.any(Date) },
    })
  })

  it('returns 404 for a notification owned by someone else', async () => {
    notificationFindUnique.mockResolvedValue({ ...notificationRow, userId: 'someone-else' } as never)
    await expect(markAsRead('user-1', 'notif-1')).rejects.toMatchObject(
      new AppError(404, 'NOT_FOUND', 'Notification introuvable'),
    )
    expect(notificationUpdate).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown notification', async () => {
    notificationFindUnique.mockResolvedValue(null)
    await expect(markAsRead('user-1', 'missing')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })
})

describe('markAllAsRead', () => {
  it('marks every unread notification as read and reports the count', async () => {
    notificationUpdateMany.mockResolvedValue({ count: 5 } as never)
    await expect(markAllAsRead('user-1')).resolves.toEqual({ updated: 5 })
    expect(notificationUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
      data: { readAt: expect.any(Date) },
    })
  })
})

describe('removeNotification', () => {
  it('deletes an owned notification', async () => {
    notificationFindUnique.mockResolvedValue(notificationRow as never)
    notificationDelete.mockResolvedValue(notificationRow as never)

    await expect(removeNotification('user-1', 'notif-1')).resolves.toEqual({ id: 'notif-1' })
    expect(notificationDelete).toHaveBeenCalledWith({ where: { id: 'notif-1' } })
  })

  it('returns 404 for a notification owned by someone else', async () => {
    notificationFindUnique.mockResolvedValue({ ...notificationRow, userId: 'someone-else' } as never)
    await expect(removeNotification('user-1', 'notif-1')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(notificationDelete).not.toHaveBeenCalled()
  })
})
