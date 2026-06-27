import { Pool } from "pg"

let pool: Pool | null = null
let schemaReady = false

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL)
}

export function getPool() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured")
  }

  if (!pool) {
    pool = new Pool({ connectionString })
  }

  return pool
}

export async function ensureSchema() {
  if (schemaReady || !hasDatabaseUrl()) {
    return
  }

  const client = await getPool().connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        caption TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'model')),
        asset_url TEXT NOT NULL,
        likes INTEGER NOT NULL DEFAULT 0,
        comments INTEGER NOT NULL DEFAULT 0,
        saves INTEGER NOT NULL DEFAULT 0
      )
    `)

    await client.query(
      "CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC)"
    )

    schemaReady = true
  } finally {
    client.release()
  }
}

export async function checkDatabaseHealth() {
  if (!hasDatabaseUrl()) {
    return { enabled: false, ok: true }
  }

  try {
    const client = await getPool().connect()

    try {
      await client.query("SELECT 1")
      return { enabled: true, ok: true }
    } finally {
      client.release()
    }
  } catch {
    return { enabled: true, ok: false }
  }
}

export async function closePool() {
  if (!pool) {
    return
  }

  await pool.end()
  pool = null
  schemaReady = false
}
