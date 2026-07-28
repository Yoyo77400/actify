import type { Request, Response } from 'express'
import * as followsService from '../services/follows.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

export async function follow(req: Request, res: Response) {
  const result = await followsService.followUser(req.user!.id, String(req.params.username))
  sendSuccess(res, result)
}

export async function unfollow(req: Request, res: Response) {
  const result = await followsService.unfollowUser(req.user!.id, String(req.params.username))
  sendSuccess(res, result)
}

export async function listFeed(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await followsService.listFollowedFeed(req.user!.id, {}, pagination)
  sendSuccess(res, items, meta)
}
