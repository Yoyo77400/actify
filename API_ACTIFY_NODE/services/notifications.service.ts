import { prisma } from './prisma'
import type { Prisma } from '../generated/prisma/client'
import { AppError, buildMeta } from '../utils/http'
import type { Pagination } from '../utils/pagination'

interface NotificationRecord {
  id: string
  type: string
  message: string
  payload: unknown
  readAt: Date | null
  createdAt: Date
}

function serializeNotification(notification: NotificationRecord) {
  return {
    id: notification.id,
    type: notification.type,
    message: notification.message,
    payload: notification.payload,
    isRead: notification.readAt !== null,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  }
}

// Internal helper for other services to raise an in-app notification (e.g.
// orders.service on a confirmed sale). Never throws: a notification failing
// to write must not fail the action that triggered it.
export async function notifyUser(userId: string, type: string, message: string, payload?: Record<string, unknown>) {
  try {
    await prisma.notification.create({ data: { userId, type, message, payload: payload as Prisma.InputJsonValue } })
  } catch (err) {
    console.error(`[notifications] failed to notify user ${userId} (${type})`, err)
  }
}

async function getOwnedNotificationOrThrow(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } })
  if (!notification || notification.userId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Notification introuvable')
  }
  return notification
}

export async function listMyNotifications(userId: string, pagination: Pagination) {
  const where = { userId }

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.notification.count({ where }),
  ])

  return { items: items.map(serializeNotification), meta: buildMeta(pagination.page, pagination.limit, total) }
}

export async function countUnread(userId: string) {
  const count = await prisma.notification.count({ where: { userId, readAt: null } })
  return { count }
}

export async function markAsRead(userId: string, notificationId: string) {
  await getOwnedNotificationOrThrow(userId, notificationId)
  const updated = await prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } })
  return serializeNotification(updated)
}

export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
  return { updated: result.count }
}

export async function removeNotification(userId: string, notificationId: string) {
  await getOwnedNotificationOrThrow(userId, notificationId)
  await prisma.notification.delete({ where: { id: notificationId } })
  return { id: notificationId }
}
