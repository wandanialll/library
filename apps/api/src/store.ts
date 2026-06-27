import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"

import { ensureSchema, getPool, hasDatabaseUrl } from "./db"
import { seedPosts } from "./data"
import type { LibraryPost, MediaType } from "./types"

const dataDirectory = resolve(process.cwd(), "data")
const uploadsDirectory = join(dataDirectory, "uploads")
const postsFilePath = join(dataDirectory, "posts.json")

let cachedPosts: LibraryPost[] | null = null

async function ensureStorage() {
  await mkdir(uploadsDirectory, { recursive: true })
}

async function readPostsFromDisk() {
  await ensureStorage()

  try {
    const raw = await readFile(postsFilePath, "utf8")
    return JSON.parse(raw) as LibraryPost[]
  } catch {
    await writeFile(postsFilePath, JSON.stringify(seedPosts, null, 2), "utf8")
    return seedPosts
  }
}

async function savePosts(posts: LibraryPost[]) {
  await ensureStorage()
  await writeFile(postsFilePath, JSON.stringify(posts, null, 2), "utf8")
}

function mapPostRow(row: {
  id: string
  title: string
  caption: string
  author: string
  created_at: string
  media_type: MediaType
  asset_url: string
  likes: number
  comments: number
  saves: number
}): LibraryPost {
  return {
    id: row.id,
    title: row.title,
    caption: row.caption,
    author: row.author,
    createdAt: new Date(row.created_at).toISOString(),
    mediaType: row.media_type,
    assetUrl: row.asset_url,
    stats: {
      likes: Number(row.likes ?? 0),
      comments: Number(row.comments ?? 0),
      saves: Number(row.saves ?? 0),
    },
  }
}

async function readPostsFromDb() {
  await ensureSchema()
  const result = await getPool().query(
    `
      SELECT
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
      FROM posts
      ORDER BY created_at DESC
    `
  )

  if (result.rowCount === 0) {
    await seedDatabaseIfEmpty()

    const seededResult = await getPool().query(
      `
        SELECT
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
        FROM posts
        ORDER BY created_at DESC
      `
    )

    return seededResult.rows.map(mapPostRow)
  }

  return result.rows.map(mapPostRow)
}

async function seedDatabaseIfEmpty() {
  await ensureSchema()

  for (const post of seedPosts) {
    await getPool().query(
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
  }
}

function fileExtensionFromMimeType(
  mimeType: string,
  fallbackFileName?: string
) {
  if (mimeType === "image/png") {
    return ".png"
  }

  if (mimeType === "image/jpeg") {
    return ".jpg"
  }

  if (mimeType === "image/webp") {
    return ".webp"
  }

  if (mimeType === "model/gltf-binary") {
    return ".glb"
  }

  if (fallbackFileName) {
    const extension = fallbackFileName.toLowerCase().match(/\.[a-z0-9]+$/)
    if (extension) {
      return extension[0]
    }
  }

  return ""
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
  if (hasDatabaseUrl()) {
    return readPostsFromDb()
  }

  if (cachedPosts) {
    return cachedPosts
  }

  cachedPosts = await readPostsFromDisk()
  return cachedPosts
}

export async function createPost(input: CreatePostInput) {
  const { mimeType, buffer } = decodeDataUrl(input.dataUrl)
  const extension = fileExtensionFromMimeType(mimeType, input.fileName)
  const slug = sanitizeBaseName(input.title || input.fileName || "upload")
  const id = `${slug}-${Date.now()}`
  const assetFileName = `${id}${extension}`
  const assetPath = join(uploadsDirectory, assetFileName)

  await ensureStorage()
  await writeFile(assetPath, buffer)

  const nextPost: LibraryPost = {
    id,
    title: input.title,
    caption: input.caption,
    author: input.author,
    createdAt: new Date().toISOString(),
    mediaType: input.mediaType,
    assetUrl: `/assets/uploads/${assetFileName}`,
    stats: {
      likes: input.likes ?? 0,
      comments: input.comments ?? 0,
      saves: input.saves ?? 0,
    },
  }

  if (hasDatabaseUrl()) {
    await ensureSchema()

    await getPool().query(
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
      `,
      [
        nextPost.id,
        nextPost.title,
        nextPost.caption,
        nextPost.author,
        nextPost.createdAt,
        nextPost.mediaType,
        nextPost.assetUrl,
        nextPost.stats.likes,
        nextPost.stats.comments,
        nextPost.stats.saves,
      ]
    )

    return nextPost
  }

  const posts = await getPosts()

  const nextPosts = [nextPost, ...posts]
  cachedPosts = nextPosts
  await savePosts(nextPosts)

  return nextPost
}
