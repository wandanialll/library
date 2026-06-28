import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { closePool, ensureSchema, getPool, hasDatabaseUrl } from "../db"
import type { LibraryPost } from "../types"

const postsFilePath = resolve(process.cwd(), "data", "posts.json")

async function readJsonPosts() {
  try {
    const raw = await readFile(postsFilePath, "utf8")
    return JSON.parse(raw) as LibraryPost[]
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return []
    }

    throw error
  }
}

async function run() {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is required to run migration")
  }

  await ensureSchema()
  const posts = await readJsonPosts()

  if (posts.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No posts found in posts.json; nothing to migrate.")
    return
  }

  const client = await getPool().connect()
  let inserted = 0

  try {
    await client.query("BEGIN")

    for (const post of posts) {
      const result = await client.query(
        `
          INSERT INTO posts (
            id,
            title,
            caption,
            author,
            created_at,
            media_type,
            asset_url,
            likes,
            comments,
            saves
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          post.id,
          post.title,
          post.caption,
          post.author,
          post.createdAt,
          post.mediaType,
          post.assetUrl,
          post.stats.likes,
          post.stats.comments,
          post.stats.saves,
        ]
      )

      if ((result.rowCount ?? 0) > 0) {
        inserted += 1
      }
    }

    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
    await closePool()
  }

  // eslint-disable-next-line no-console
  console.log(`Migration finished. Inserted ${inserted} new post(s).`)
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exitCode = 1
})
