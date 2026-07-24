import type { Request, Response } from 'express'
import * as notificationsService from '../services/notifications.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

export async function listMine(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await notificationsService.listMyNotifications(req.user!.id, pagination)
  sendSuccess(res, items, meta)
}

export async function unreadCount(req: Request, res: Response) {
  sendSuccess(res, await notificationsService.countUnread(req.user!.id))
}

export async function markRead(req: Request, res: Response) {
  sendSuccess(res, await notificationsService.markAsRead(req.user!.id, String(req.params.id)))
}

export async function markAllRead(req: Request, res: Response) {
  sendSuccess(res, await notificationsService.markAllAsRead(req.user!.id))
}

export async function remove(req: Request, res: Response) {
  sendSuccess(res, await notificationsService.removeNotification(req.user!.id, String(req.params.id)))
}
