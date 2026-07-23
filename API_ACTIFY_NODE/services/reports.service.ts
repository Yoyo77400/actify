import { prisma } from './prisma'
import { AppError } from '../utils/http'

const TARGET_TYPES = ['asset', 'review'] as const
type TargetType = (typeof TARGET_TYPES)[number]

const REASON_DESCRIPTIONS: Record<string, string> = {
  copyright: 'Violation de droits d\'auteur / contenu piraté',
  inappropriate: 'Contenu inapproprié',
  spam: 'Spam / publicité non désirée',
  scam: 'Arnaque / tromperie sur le contenu',
  other: 'Autre (voir details)',
}
const REASONS = Object.keys(REASON_DESCRIPTIONS)
const STATUS_PENDING = 'Pending'

export interface CreateReportInput {
  targetType?: unknown
  targetId?: unknown
  reason?: unknown
  details?: unknown
}

interface ReportRecord {
  id: string
  targetType: string
  targetId: string
  reason: string
  details: string | null
  status: string
  resolutionNote: string | null
  resolvedAt: Date | null
  createdAt: Date
}

function serializeReport(report: ReportRecord) {
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    details: report.details,
    status: report.status,
    resolutionNote: report.resolutionNote,
    resolvedAt: report.resolvedAt,
    createdAt: report.createdAt,
  }
}

// Reports point at an asset or a review by id — confirm the target is real
// before recording a signal against it, same 404 as any other missing resource.
async function assertTargetExists(targetType: TargetType, targetId: string) {
  if (targetType === 'asset') {
    const listing = await prisma.listing.findFirst({ where: { id: targetId, deletedAt: null } })
    if (!listing) throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
    return
  }
  const review = await prisma.review.findUnique({ where: { id: targetId } })
  if (!review) throw new AppError(404, 'NOT_FOUND', 'Avis introuvable')
}

export function listReportReasons() {
  return REASONS.map((value) => ({ value, description: REASON_DESCRIPTIONS[value] }))
}

export async function createReport(userId: string, input: CreateReportInput) {
  const targetType = input.targetType
  if (typeof targetType !== 'string' || !TARGET_TYPES.includes(targetType as TargetType)) {
    throw new AppError(400, 'VALIDATION_ERROR', `targetType doit être l'un de : ${TARGET_TYPES.join(', ')}`)
  }
  if (typeof input.targetId !== 'string' || input.targetId.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'targetId est requis')
  }
  if (typeof input.reason !== 'string' || !REASONS.includes(input.reason)) {
    throw new AppError(400, 'VALIDATION_ERROR', `reason doit être l'un de : ${REASONS.join(', ')}`)
  }
  const details = input.details
  if (details !== undefined && details !== null && typeof details !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'details doit être une chaîne de caractères')
  }

  await assertTargetExists(targetType as TargetType, input.targetId)

  const created = await prisma.report.create({
    data: {
      reporterId: userId,
      targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: (details as string | undefined) ?? null,
      status: STATUS_PENDING,
    },
  })

  return serializeReport(created)
}
