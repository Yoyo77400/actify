import type { Request, Response } from 'express'
import * as reportsService from '../services/reports.service'
import { sendSuccess } from '../utils/http'

export async function create(req: Request, res: Response) {
  const body = req.body ?? {}
  const report = await reportsService.createReport(req.user!.id, {
    targetType: body.targetType,
    targetId: body.targetId,
    reason: body.reason,
    details: body.details,
  })
  sendSuccess(res, report, undefined, 201)
}

export async function listReasons(_req: Request, res: Response) {
  sendSuccess(res, reportsService.listReportReasons())
}
