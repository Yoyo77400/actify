import type { Request, Response } from 'express'
import * as ordersService from '../services/orders.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

export async function create(req: Request, res: Response) {
  const body = req.body ?? {}
  const order = await ordersService.createOrder(req.user!.id, { assetId: body.assetId })
  sendSuccess(res, order, undefined, 201)
}

export async function list(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await ordersService.listOrders(req.user!.id, pagination)
  sendSuccess(res, items, meta)
}

export async function getPendingForAsset(req: Request, res: Response) {
  const order = await ordersService.getPendingOrderForAsset(req.user!.id, String(req.params.assetId))
  sendSuccess(res, order)
}

export async function getById(req: Request, res: Response) {
  const order = await ordersService.getOrder(req.user!.id, String(req.params.id))
  sendSuccess(res, order)
}

export async function confirm(req: Request, res: Response) {
  const body = req.body ?? {}
  const order = await ordersService.confirmOrder(req.user!.id, String(req.params.id), body.txHash)
  sendSuccess(res, order)
}

export async function cancel(req: Request, res: Response) {
  const order = await ordersService.cancelOrder(req.user!.id, String(req.params.id))
  sendSuccess(res, order)
}
