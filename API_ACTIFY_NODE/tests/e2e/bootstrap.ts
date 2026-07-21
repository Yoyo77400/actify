/**
 * E2E backend bootstrap.
 *
 * Boots the REAL Actify API (createApp + real services/prisma) against an
 * in-memory PostgreSQL provided by pglite (Postgres compiled to WASM). No
 * Docker, no external DB, torn down when the process exits.
 *
 * pglite is a genuine Postgres — the prod migrations (pg_trgm extension, GIN
 * trigram indexes, …) run verbatim, so the e2e suite exercises real backend
 * code and real SQL, only swapping where the bytes are stored.
 *
 * Run:  DATABASE_URL is set HERE, so this file must be the entrypoint (the app
 *       reads it at import time). Playwright starts it as a webServer.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

// CommonJS build (see tsconfig `module`): __dirname, not import.meta.
const API_ROOT = join(__dirname, '..', '..')
const MIGRATIONS_DIR = join(API_ROOT, 'prisma', 'migrations')

const DB_PORT = Number(process.env.E2E_DB_PORT) || 5544
const API_PORT = Number(process.env.PORT) || 3000

/** Applies every prisma/migrations/<ts>/migration.sql in chronological order. */
async function applyMigrations(db: PGlite) {
  const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()

  for (const dir of dirs) {
    const sql = readFileSync(join(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8')
    await db.exec(sql)
  }
  console.log(`[e2e-db] applied ${dirs.length} migrations`)
}

async function main() {
  // 1. In-memory Postgres + the pg_trgm extension the schema depends on.
  const db = await PGlite.create({ extensions: { pg_trgm } })
  await applyMigrations(db)

  // 2. Expose it on the PG wire protocol so @prisma/adapter-pg can connect.
  const server = new PGLiteSocketServer({ db, port: DB_PORT, host: '127.0.0.1' })
  await server.start()
  console.log(`[e2e-db] pglite serving on 127.0.0.1:${DB_PORT}`)

  // 3. Configure the real app BEFORE importing it (services/prisma + utils/jwt
  //    read these at module load). pglite serves one connection at a time, so
  //    pin the pool to 1.
  process.env.DATABASE_URL = `postgresql://postgres@127.0.0.1:${DB_PORT}/postgres`
  process.env.DATABASE_POOL_MAX = '1'
  process.env.JWT_SECRET ??= 'e2e-secret'
  process.env.PORT = String(API_PORT)
  // ADMIN_WALLET_ADDRESS may be injected by the caller to auto-promote the
  // e2e admin wallet on first login (see wallets.service.ts).

  // 4. Boot the real API.
  const { createApp } = await import('../../app')
  const app = createApp()
  const httpServer = app.listen(API_PORT, '127.0.0.1', () => {
    console.log(`[e2e-api] Actify API listening on http://127.0.0.1:${API_PORT}`)
  })

  const shutdown = async () => {
    httpServer.close()
    await server.stop()
    await db.close()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('[e2e] bootstrap failed', err)
  process.exit(1)
})
