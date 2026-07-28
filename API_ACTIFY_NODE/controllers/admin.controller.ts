import type { Request, Response } from 'express'
import * as adminService from '../services/admin.service'
import * as assetsService from '../services/assets.service'
import * as usersService from '../services/users.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function listAssets(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const query = req.query as Record<string, unknown>

  const { items, meta } = await adminService.listAllAssets(
    {
      status: queryString(query.status),
      sellerId: queryString(query.sellerId),
      q: queryString(query.q),
      from: queryString(query.from),
      to: queryString(query.to),
    },
    pagination,
  )

  sendSuccess(res, items, meta)
}

export async function updateAssetStatus(req: Request, res: Response) {
  const body = req.body ?? {}
  const result = await adminService.updateAssetStatus(String(req.params.id), body.status)
  sendSuccess(res, result)
}

// Full editable listing shape, for the admin edit form to prefill.
export async function getAsset(req: Request, res: Response) {
  sendSuccess(res, await assetsService.getAssetForAdmin(String(req.params.id)))
}

// Moderation edit: off-chain listing fields only (title/description/price/...).
// Whatever's already minted on-chain (see the Nft model) stays immutable -
// this never touches it.
export async function updateAsset(req: Request, res: Response) {
  const body = req.body ?? {}
  const result = await assetsService.adminUpdateAsset(String(req.params.id), {
    title: body.title,
    description: body.description,
    shortDescription: body.shortDescription,
    tags: body.tags,
    categoryIds: body.categoryIds,
    distributionMode: body.distributionMode,
    maxDownloads: body.maxDownloads,
    isFree: body.isFree,
    basePrice: body.basePrice,
    currency: body.currency,
    royaltyBps: body.royaltyBps,
  })
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
      from: queryString(query.from),
      to: queryString(query.to),
    },
    pagination,
  )

  sendSuccess(res, items, meta)
}

export async function getUser(req: Request, res: Response) {
  sendSuccess(res, await adminService.getUserDetail(String(req.params.id)))
}

// Identity fields only (username/displayName/bio) - never the wallet list,
// never role/ban (those already have their own dedicated actions below).
export async function updateUser(req: Request, res: Response) {
  const body = req.body ?? {}
  const result = await usersService.adminUpdateUser(String(req.params.id), {
    username: body.username,
    displayName: body.displayName,
    bio: body.bio,
  })
  sendSuccess(res, result)
}

export async function banUser(req: Request, res: Response) {
  sendSuccess(res, await adminService.setUserBanStatus(String(req.params.id), true))
}

export async function unbanUser(req: Request, res: Response) {
  sendSuccess(res, await adminService.setUserBanStatus(String(req.params.id), false))
}

export async function updateUserRole(req: Request, res: Response) {
  const body = req.body ?? {}
  const result = await adminService.updateUserRole(req.user!.id, String(req.params.id), body.role)
  sendSuccess(res, result)
}

export async function listOrders(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const query = req.query as Record<string, unknown>

  const { items, meta } = await adminService.listOrders(
    {
      status: queryString(query.status),
      q: queryString(query.q),
      from: queryString(query.from),
      to: queryString(query.to),
    },
    pagination,
  )

  sendSuccess(res, items, meta)
}

export async function getStats(_req: Request, res: Response) {
  sendSuccess(res, await adminService.getAdminStats())
}

export async function listReports(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const query = req.query as Record<string, unknown>

  const { items, meta } = await adminService.listReports(
    { status: queryString(query.status), targetType: queryString(query.targetType) },
    pagination,
  )

  sendSuccess(res, items, meta)
}

export async function resolveReport(req: Request, res: Response) {
  const body = req.body ?? {}
  const result = await adminService.resolveReport(req.user!.id, String(req.params.id), {
    status: body.status,
    resolutionNote: body.resolutionNote,
  })
  sendSuccess(res, result)
}
