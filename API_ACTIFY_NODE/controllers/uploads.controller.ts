import type { Request, Response } from 'express'
import { unlink } from 'node:fs/promises'
import { AppError, sendSuccess } from '../utils/http'
import { compressThumbnail, resolveStoredPath, sniffImageMime } from '../services/storage'
import * as uploadsService from '../services/uploads.service'
import * as collectionsService from '../services/collections.service'

function requireUploadedFile(req: Request) {
  if (!req.file) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Aucun fichier reçu (ou format non supporté)')
  }
  return req.file
}

export async function uploadFile(req: Request, res: Response) {
  const file = requireUploadedFile(req)
  const result = await uploadsService.setAssetFile(req.user!.id, String(req.params.id), file.filename)
  sendSuccess(res, result, undefined, 201)
}

export async function uploadThumbnail(req: Request, res: Response) {
  const file = requireUploadedFile(req)
  try {
    await compressThumbnail(file.path)
  } catch {
    await unlink(file.path).catch(() => {})
    throw new AppError(400, 'VALIDATION_ERROR', 'Image de miniature invalide ou illisible')
  }
  const result = await uploadsService.setAssetThumbnail(req.user!.id, String(req.params.id), file.filename)
  sendSuccess(res, result, undefined, 201)
}

// Profile images. No ownership lookup needed: the target is always the
// authenticated caller's own row, never an id taken from the request.
export async function uploadAvatar(req: Request, res: Response) {
  const file = requireUploadedFile(req)
  const result = await uploadsService.setUserAvatar(req.user!.id, file.filename)
  sendSuccess(res, result, undefined, 201)
}

export async function uploadBanner(req: Request, res: Response) {
  const file = requireUploadedFile(req)
  const result = await uploadsService.setUserBanner(req.user!.id, file.filename)
  sendSuccess(res, result, undefined, 201)
}

// Couverture d'une collection. Même traitement que les miniatures d'asset :
// l'image est compressée, et un fichier illisible est supprimé plutôt que
// laissé sur le disque.
export async function uploadCollectionImage(req: Request, res: Response) {
  const file = requireUploadedFile(req)
  try {
    await compressThumbnail(file.path)
  } catch {
    await unlink(file.path).catch(() => {})
    throw new AppError(400, 'VALIDATION_ERROR', 'Image invalide ou illisible')
  }
  const result = await collectionsService.setCollectionImage(
    req.user!.id,
    Number(req.params.id),
    file.filename,
  )
  sendSuccess(res, result, undefined, 201)
}

// Public raw-file serving (thumbnails and other display images). The main
// asset file's key is never exposed to clients, so it can't be fetched here —
// it is only delivered through the entitlement-checked download-token flow.
export function serveFile(req: Request, res: Response) {
  const path = resolveStoredPath(String(req.params.key))
  if (!path) {
    throw new AppError(404, 'NOT_FOUND', 'Fichier introuvable')
  }

  // Never trust the stored extension for what the browser does with the
  // bytes: sniff the real content. A verified raster image renders inline
  // (thumbnails); anything else — including a file mislabeled .png that's
  // actually HTML/SVG/script — is forced to download as an opaque blob so it
  // can never execute. Upload itself stays unrestricted; this only governs
  // how this one public route hands bytes back to a browser.
  const mime = sniffImageMime(path)
  if (mime) {
    res.type(mime)
    // A verified image may be the `image` of an asset's XLS-24 metadata, so
    // wallets and explorers render it from their own origin. helmet's default
    // same-origin CORP blocks that. Scoped to sniffed images only: opaque
    // blobs keep the restrictive default, having no reason to be embedded.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else {
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', 'attachment')
  }
  res.sendFile(path)
}
