import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — load your .env before importing this module')
}

// Prisma 7 driver-adapter model: the client connects through the pg adapter.
const poolMax = process.env.DATABASE_POOL_MAX ? Number(process.env.DATABASE_POOL_MAX) : undefined
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: poolMax })

export const prisma = new PrismaClient({ adapter })
