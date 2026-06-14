import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — load your .env before importing this module')
}

// Shared connection pool for raw SQL queries.
// Prisma handles the ORM layer; use this only for queries Prisma can't express.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
