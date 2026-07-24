import { prisma } from './prisma'
import { AppError } from '../utils/http'

interface ConsentRecord {
  category: string
  isGranted: boolean
  policyVersion: string | null
  createdAt: Date
  updatedAt: Date
}

export interface UpsertConsentInput {
  category?: unknown
  isGranted?: unknown
  policyVersion?: unknown
}

function serializeConsent(consent: ConsentRecord) {
  return {
    category: consent.category,
    isGranted: consent.isGranted,
    policyVersion: consent.policyVersion,
    createdAt: consent.createdAt,
    updatedAt: consent.updatedAt,
  }
}

function validateCategory(category: unknown): string {
  if (typeof category !== 'string' || category.trim().length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'category est requis')
  }
  return category.trim()
}

export async function listMyConsents(userId: string) {
  const consents = await prisma.consent.findMany({ where: { userId }, orderBy: { category: 'asc' } })
  return consents.map(serializeConsent)
}

// Upsert: one row per (user, category) — a new decision overwrites the
// previous one instead of accumulating a history the schema doesn't track.
export async function upsertConsent(userId: string, input: UpsertConsentInput) {
  const category = validateCategory(input.category)
  if (typeof input.isGranted !== 'boolean') {
    throw new AppError(400, 'VALIDATION_ERROR', 'isGranted doit être un booléen')
  }
  const policyVersion = input.policyVersion
  if (policyVersion !== undefined && policyVersion !== null && typeof policyVersion !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'policyVersion doit être une chaîne de caractères')
  }

  const consent = await prisma.consent.upsert({
    where: { userId_category: { userId, category } },
    update: { isGranted: input.isGranted, policyVersion: (policyVersion as string | undefined) ?? null },
    create: { userId, category, isGranted: input.isGranted, policyVersion: (policyVersion as string | undefined) ?? null },
  })

  return serializeConsent(consent)
}

export async function revokeConsent(userId: string, category: string) {
  const existing = await prisma.consent.findUnique({ where: { userId_category: { userId, category } } })
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Consentement introuvable')
  }

  const updated = await prisma.consent.update({
    where: { userId_category: { userId, category } },
    data: { isGranted: false },
  })
  return serializeConsent(updated)
}
