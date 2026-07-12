import type { Request, Response } from 'express'
import * as adminService from '../services/admin.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function listAssets(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const query = req.query as Record<string, unknown>

  const { items, meta } = await adminService.listAllAssets(
    { status: queryString(query.status), sellerId: queryString(query.sellerId) },
    pagination,
  )

  sendSuccess(res, items, meta)
}

export async function updateAssetStatus(req: Request, res: Response) {
  const body = req.body ?? {}
  const result = await adminService.updateAssetStatus(String(req.params.id), body.status)
  sendSuccess(res, result)
}

export async function removeAsset(req: Request, res: Response) {
  const result = await adminService.forceDeleteAsset(String(req.params.id))
  sendSuccess(res, result)
}

export async function listUsers(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const query = req.query as Record<string, unknown>

  const { items, meta } = await adminService.listUsers(
    {
      q: queryString(query.q),
      banned: query.banned !== undefined ? query.banned === 'true' : undefined,
      role: queryString(query.role),
    },
    pagination,
  )

  sendSuccess(res, items, meta)
}

export async function getUser(req: Request, res: Response) {
  sendSuccess(res, await adminService.getUserDetail(String(req.params.id)))
}

export async function banUser(req: Request, res: Response) {
  sendSuccess(res, await adminService.setUserBanStatus(String(req.params.id), true))
}

export async function unbanUser(req: Request, res: Response) {
  sendSuccess(res, await adminService.setUserBanStatus(String(req.params.id), false))
}

export async function updateUserRole(req: Request, res: Response) {
  const body = req.body ?? {}
  const result = await adminService.updateUserRole(String(req.params.id), body.role)
  sendSuccess(res, result)
}

export async function listOrders(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const query = req.query as Record<string, unknown>

  const { items, meta } = await adminService.listOrders({ status: queryString(query.status) }, pagination)

  sendSuccess(res, items, meta)
}

export async function getStats(_req: Request, res: Response) {
  sendSuccess(res, await adminService.getAdminStats())
}
