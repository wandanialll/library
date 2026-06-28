import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

import { Pool } from "pg"

let pool: Pool | null = null
let schemaReady = false

type AuthUser = {
  id: string
  username: string
  display_name: string
  role: string
  password_hash: string | null
}

export function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derivedKey = scryptSync(password, salt, 64)

  return `scrypt$${salt.toString("base64")}$${derivedKey.toString("base64")}`
}

export function verifyPassword(password: string, passwordHash: string) {
  const parts = passwordHash.split("$")

  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false
  }

  const salt = Buffer.from(parts[1], "base64")
  const expected = Buffer.from(parts[2], "base64")
  const actual = scryptSync(password, salt, expected.length)

  if (expected.length !== actual.length) {
    return false
  }

  return timingSafeEqual(expected, actual)
}

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
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT"
    )

    await client.query(`
      CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        mime_type TEXT NOT NULL,
        original_file_name TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        binary_data BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        media_asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
        title TEXT NOT NULL,
        caption TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'model')),
        likes INTEGER NOT NULL DEFAULT 0,
        comments INTEGER NOT NULL DEFAULT 0,
        saves INTEGER NOT NULL DEFAULT 0
      )
    `)

    await client.query(
      "CREATE INDEX IF NOT EXISTS app_posts_created_at_idx ON app_posts (created_at DESC)"
    )
    await client.query(
      "CREATE INDEX IF NOT EXISTS app_posts_user_id_idx ON app_posts (user_id)"
    )
    await client.query(
      "CREATE INDEX IF NOT EXISTS app_posts_media_asset_id_idx ON app_posts (media_asset_id)"
    )

    await ensureAdminUser(client)

    schemaReady = true
  } finally {
    client.release()
  }
}

async function ensureAdminUser(client: {
  query: (queryText: string, values?: unknown[]) => Promise<unknown>
}) {
  const username = process.env.AUTH_USERNAME ?? "admin"
  const password = process.env.AUTH_PASSWORD ?? "change-me"
  const passwordHash = hashPassword(password)

  await client.query(
    `
      INSERT INTO users (id, username, display_name, role, password_hash)
      VALUES ($1, $2, $3, 'admin', $4)
      ON CONFLICT (username) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          role = 'admin',
          password_hash = EXCLUDED.password_hash
    `,
    [username, username, username, passwordHash]
  )
}

export async function findAuthUserByUsername(username: string) {
  if (!hasDatabaseUrl()) {
    return null
  }

  await ensureSchema()

  const result = await getPool().query<AuthUser>(
    `
      SELECT id, username, display_name, role, password_hash
      FROM users
      WHERE username = $1
      LIMIT 1
    `,
    [username]
  )

  const user = result.rows[0]

  if (!user) {
    return null
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    passwordHash: user.password_hash,
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
