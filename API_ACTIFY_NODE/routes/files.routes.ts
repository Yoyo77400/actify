import { Router } from 'express'
import * as uploadsController from '../controllers/uploads.controller'

export const filesRouter = Router()

// Public raw file serving for display images (thumbnails). Not wrapped in the
// JSON envelope — it streams the file bytes.
filesRouter.get('/:key', uploadsController.serveFile)
