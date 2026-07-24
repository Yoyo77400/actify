import type { Request, Response } from 'express'
import { AppError, sendSuccess } from '../utils/http'
import { resolveStoredPath, sniffImageMime } from '../services/storage'
import * as uploadsService from '../services/uploads.service'

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
  const result = await uploadsService.setAssetThumbnail(req.user!.id, String(req.params.id), file.filename)
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
  } else {
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', 'attachment')
  }
  res.sendFile(path)
}
