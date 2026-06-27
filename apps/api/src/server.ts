import { createHmac, timingSafeEqual } from "node:crypto"
import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, join, resolve } from "node:path"

import { checkDatabaseHealth } from "./db"
import { createPost, getPosts, type CreatePostInput } from "./store"
import type { LibraryPost } from "./types"

const port = Number(process.env.PORT ?? 3001)
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES ?? 20 * 1024 * 1024)
const allowedOrigin = process.env.CORS_ORIGIN ?? "*"
const authUsername = process.env.AUTH_USERNAME ?? "admin"
const authPassword = process.env.AUTH_PASSWORD ?? "change-me"
const authSecret = process.env.AUTH_SECRET ?? "dev-secret-change"
const authTokenTtlSeconds = Number(process.env.AUTH_TOKEN_TTL_SECONDS ?? 86400)
const mockDataDirectory = resolve(process.cwd(), "../../mock_data")
const uploadsDirectory = resolve(process.cwd(), "data", "uploads")

type LoginRequest = {
  username: string
  password: string
}

type AuthTokenPayload = {
  sub: string
  exp: number
}

function normalizePath(pathname: string) {
  return pathname.startsWith("/api") ? pathname.slice(4) || "/" : pathname
}

function sendJson(
  response: import("node:http").ServerResponse,
  statusCode: number,
  payload: unknown
) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  })
  response.end(JSON.stringify(payload, null, 2))
}

function sendText(
  response: import("node:http").ServerResponse,
  statusCode: number,
  payload: string
) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin,
  })
  response.end(payload)
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function signTokenPayload(payloadBase64: string) {
  return createHmac("sha256", authSecret)
    .update(payloadBase64)
    .digest("base64url")
}

function createToken(subject: string) {
  const payload: AuthTokenPayload = {
    sub: subject,
    exp: Math.floor(Date.now() / 1000) + authTokenTtlSeconds,
  }
  const payloadBase64 = toBase64Url(JSON.stringify(payload))
  const signature = signTokenPayload(payloadBase64)

  return `${payloadBase64}.${signature}`
}

function parseBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader) {
    return null
  }

  const [scheme, token] = authorizationHeader.split(" ")

  if (scheme !== "Bearer" || !token) {
    return null
  }

  return token
}

function verifyToken(token: string) {
  const [payloadBase64, signature] = token.split(".")

  if (!payloadBase64 || !signature) {
    return false
  }

  const expectedSignature = signTokenPayload(payloadBase64)
  const expectedBuffer = Buffer.from(expectedSignature)
  const actualBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== actualBuffer.length) {
    return false
  }

  if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
    return false
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadBase64)) as AuthTokenPayload
    return payload.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

async function readJsonBody<T>(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = []
  let totalSize = 0

  for await (const chunk of request) {
    const nextChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    totalSize += nextChunk.length

    if (totalSize > maxBodyBytes) {
      throw new Error("Payload too large")
    }

    chunks.push(nextChunk)
  }

  const rawBody = Buffer.concat(chunks).toString("utf8")

  if (!rawBody) {
    throw new Error("Missing request body")
  }

  return JSON.parse(rawBody) as T
}

function isCreatePostInput(value: unknown): value is CreatePostInput {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const input = value as Partial<CreatePostInput>

  return (
    typeof input.title === "string" &&
    typeof input.caption === "string" &&
    typeof input.author === "string" &&
    (input.mediaType === "photo" || input.mediaType === "model") &&
    typeof input.fileName === "string" &&
    typeof input.dataUrl === "string"
  )
}

async function serveAsset(
  response: import("node:http").ServerResponse,
  assetName: string,
  sendBody = true
) {
  if (assetName.includes("..")) {
    throw new Error("Invalid asset path")
  }

  const filePath = assetName.startsWith("uploads/")
    ? join(uploadsDirectory, assetName.slice("uploads/".length))
    : join(mockDataDirectory, assetName)
  const fileBuffer = await readFile(filePath)
  const extension = extname(filePath).toLowerCase()

  const contentType =
    extension === ".png"
      ? "image/png"
      : extension === ".glb"
        ? "model/gltf-binary"
        : "application/octet-stream"

  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": allowedOrigin,
  })

  if (sendBody) {
    response.end(fileBuffer)
    return
  }

  response.end()
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`
  )
  const pathname = normalizePath(requestUrl.pathname)

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    })
    response.end()
    return
  }

  if (
    pathname === "/health" &&
    ["GET", "HEAD"].includes(request.method ?? "GET")
  ) {
    const database = await checkDatabaseHealth()
    sendJson(response, database.ok ? 200 : 503, { ok: database.ok, database })
    return
  }

  if (
    pathname === "/posts" &&
    ["GET", "HEAD"].includes(request.method ?? "GET")
  ) {
    const posts = await getPosts()
    sendJson(response, 200, { posts })
    return
  }

  if (pathname === "/auth/login" && request.method === "POST") {
    try {
      const body = await readJsonBody<LoginRequest>(request)

      if (body.username !== authUsername || body.password !== authPassword) {
        sendJson(response, 401, { message: "Invalid credentials" })
        return
      }

      const token = createToken(body.username)
      sendJson(response, 200, {
        token,
        expiresIn: authTokenTtlSeconds,
      })
    } catch (error) {
      if (error instanceof Error && error.message === "Payload too large") {
        sendJson(response, 413, { message: error.message })
        return
      }

      sendJson(response, 400, { message: "Invalid login request body" })
    }

    return
  }

  if (pathname === "/posts" && request.method === "POST") {
    const bearerToken = parseBearerToken(request.headers.authorization)

    if (!bearerToken || !verifyToken(bearerToken)) {
      sendJson(response, 401, { message: "Unauthorized" })
      return
    }

    try {
      const body = await readJsonBody<unknown>(request)

      if (!isCreatePostInput(body)) {
        sendJson(response, 400, { message: "Invalid post payload" })
        return
      }

      const post = await createPost(body)
      sendJson(response, 201, post)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Payload too large") {
          sendJson(response, 413, { message: error.message })
          return
        }

        sendJson(response, 400, { message: error.message })
        return
      }

      sendJson(response, 500, { message: "Failed to create post" })
    }

    return
  }

  if (
    pathname.startsWith("/posts/") &&
    ["GET", "HEAD"].includes(request.method ?? "GET")
  ) {
    const postId = pathname.slice("/posts/".length)
    const posts: LibraryPost[] = await getPosts()
    const post = posts.find((entry) => entry.id === postId)

    if (!post) {
      sendJson(response, 404, { message: "Post not found" })
      return
    }

    sendJson(response, 200, post)
    return
  }

  if (
    pathname.startsWith("/assets/") &&
    ["GET", "HEAD"].includes(request.method ?? "GET")
  ) {
    const assetName = decodeURIComponent(pathname.slice("/assets/".length))

    try {
      await serveAsset(response, assetName, request.method !== "HEAD")
    } catch {
      sendJson(response, 404, { message: "Asset not found" })
    }

    return
  }

  if (pathname === "/") {
    sendText(
      response,
      200,
      "Library API is running. Use GET /health, POST /auth/login, GET /posts, POST /posts, GET /posts/:id, and GET /assets/:fileName."
    )
    return
  }

  sendJson(response, 404, { message: "Route not found" })
})

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Library API listening on http://localhost:${port}`)
})
