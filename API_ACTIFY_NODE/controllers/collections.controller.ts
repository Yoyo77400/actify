import type { Request, Response } from 'express'
import * as collectionsService from '../services/collections.service'
import { sendSuccess } from '../utils/http'
import { parsePagination } from '../utils/pagination'

export async function list(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await collectionsService.listCollections(pagination)
  sendSuccess(res, items, meta)
}

export async function getBySlug(req: Request, res: Response) {
  const collection = await collectionsService.getCollectionBySlug(
    String(req.params.slug),
    req.user?.id ?? null,
  )
  sendSuccess(res, collection)
}

export async function listAssets(req: Request, res: Response) {
  const pagination = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await collectionsService.listCollectionAssets(
    String(req.params.slug),
    pagination,
    req.user?.id ?? null,
  )
  sendSuccess(res, items, meta)
}

export async function listMine(req: Request, res: Response) {
  sendSuccess(res, await collectionsService.listMyCollections(req.user!.id))
}

export async function create(req: Request, res: Response) {
  const collection = await collectionsService.createCollection(req.user!.id, {
    name: (req.body ?? {}).name,
  })
  sendSuccess(res, collection, undefined, 201)
}

export async function update(req: Request, res: Response) {
  const collection = await collectionsService.updateCollection(
    req.user!.id,
    Number(req.params.id),
    { name: (req.body ?? {}).name },
  )
  sendSuccess(res, collection)
}

export async function remove(req: Request, res: Response) {
  sendSuccess(res, await collectionsService.deleteCollection(req.user!.id, Number(req.params.id)))
}
