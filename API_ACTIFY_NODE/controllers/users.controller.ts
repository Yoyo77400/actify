import type { Request, Response } from 'express'
import * as usersService from '../services/users.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

export async function getMe(req: Request, res: Response) {
  const me = await usersService.getMe(req.user!.id)
  sendSuccess(res, me)
}

export async function updateMe(req: Request, res: Response) {
  const { username, displayName, bio, avatarCid } = req.body ?? {}
  const me = await usersService.updateMe(req.user!.id, { username, displayName, bio, avatarCid })
  sendSuccess(res, me)
}

export async function deleteMe(req: Request, res: Response) {
  const result = await usersService.softDeleteMe(req.user!.id)
  sendSuccess(res, result)
}

export async function exportMyData(req: Request, res: Response) {
  const data = await usersService.exportMyData(req.user!.id)
  sendSuccess(res, data)
}

export async function getPublicProfile(req: Request, res: Response) {
  const profile = await usersService.getPublicProfile(String(req.params.username))
  sendSuccess(res, profile)
}

export async function listUserAssets(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await usersService.listUserAssets(String(req.params.username), pagination)
  sendSuccess(res, items, meta)
}

export async function listUserReviews(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await usersService.listUserReviews(String(req.params.username), pagination)
  sendSuccess(res, items, meta)
}
