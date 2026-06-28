import { randomUUID } from "node:crypto"

import { ensureSchema, getPool, hasDatabaseUrl } from "./db"
import type { LibraryPost, MediaType } from "./types"

function mapPostRow(row: {
  id: string
  title: string
  caption: string
  author_name: string
  created_at: string
  media_type: MediaType
  media_asset_id: string
  likes: number
  comments: number
  saves: number
}): LibraryPost {
  return {
    id: row.id,
    title: row.title,
    caption: row.caption,
    author: row.author_name,
    createdAt: new Date(row.created_at).toISOString(),
    mediaType: row.media_type,
    assetUrl: `/assets/media/${row.media_asset_id}`,
    stats: {
      likes: Number(row.likes ?? 0),
      comments: Number(row.comments ?? 0),
      saves: Number(row.saves ?? 0),
    },
  }
}

async function readPostsFromDb() {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is required")
  }

  await ensureSchema()
  const result = await getPool().query(
    `
      SELECT
        posts.id,
        posts.title,
        posts.caption,
        users.display_name AS author_name,
        posts.created_at,
        posts.media_type,
        posts.media_asset_id,
        posts.likes,
        posts.comments,
        posts.saves
      FROM app_posts AS posts
      INNER JOIN users ON users.id = posts.user_id
      ORDER BY created_at DESC
    `
  )

  return result.rows.map(mapPostRow)
}

function sanitizeBaseName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)

  if (!match) {
    throw new Error("File content must be a base64 data URL")
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  }
}

export type CreatePostInput = {
  title: string
  caption: string
  author: string
  mediaType: MediaType
  fileName: string
  dataUrl: string
  likes?: number
  comments?: number
  saves?: number
}

export async function getPosts() {
  return readPostsFromDb()
}

export async function createPost(input: CreatePostInput) {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is required")
  }

  const { mimeType, buffer } = decodeDataUrl(input.dataUrl)
  const slug = sanitizeBaseName(input.title || input.fileName || "upload")
  const id = `${slug}-${Date.now()}`
  const assetId = randomUUID()

  await ensureSchema()

  const authorResult = await getPool().query<{ id: string }>(
    `
      SELECT id
      FROM users
      WHERE username = $1
      LIMIT 1
    `,
    [input.author]
  )

  const authorId = authorResult.rows[0]?.id

  if (!authorId) {
    throw new Error("Author account not found")
  }

  await getPool().query(
    `
      INSERT INTO media_assets (
        id,
        mime_type,
        original_file_name,
        byte_size,
        binary_data
      )
      VALUES ($1,$2,$3,$4,$5)
    `,
    [assetId, mimeType, input.fileName, buffer.length, buffer]
  )

  const nextPost: LibraryPost = {
    id,
    title: input.title,
    caption: input.caption,
    author: input.author,
    createdAt: new Date().toISOString(),
    mediaType: input.mediaType,
    assetUrl: `/assets/media/${assetId}`,
    stats: {
      likes: input.likes ?? 0,
      comments: input.comments ?? 0,
      saves: input.saves ?? 0,
    },
  }

  await getPool().query(
    `
      INSERT INTO app_posts (
        id,
        user_id,
        media_asset_id,
        title,
        caption,
        created_at,
        media_type,
        likes,
        comments,
        saves
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `,
    [
      nextPost.id,
      authorId,
      assetId,
      nextPost.title,
      nextPost.caption,
      nextPost.createdAt,
      nextPost.mediaType,
      nextPost.stats.likes,
      nextPost.stats.comments,
      nextPost.stats.saves,
    ]
  )

  return nextPost
}

export async function getMediaAssetById(assetId: string) {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is required")
  }

  await ensureSchema()

  const result = await getPool().query<{
    mime_type: string
    binary_data: Buffer
  }>(
    `
      SELECT mime_type, binary_data
      FROM media_assets
      WHERE id = $1
      LIMIT 1
    `,
    [assetId]
  )

  const row = result.rows[0]

  if (!row) {
    return null
  }

  return {
    mimeType: row.mime_type,
    buffer: row.binary_data,
  }
}
