import type { LibraryPost } from "./library-data"

type PostsResponse = {
  posts: LibraryPost[]
}

type LoginResponse = {
  token: string
  expiresIn: number
}

const apiBaseUrl = import.meta.env.VITE_LIBRARY_API_BASE_URL ?? "/api"
const authTokenStorageKey = "library.authToken"

export function resolveAssetUrl(assetUrl: string) {
  if (/^https?:\/\//.test(assetUrl)) {
    return assetUrl
  }

  return `${apiBaseUrl}${assetUrl}`
}

export function getAuthToken() {
  return window.localStorage.getItem(authTokenStorageKey)
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(authTokenStorageKey, token)
}

export function clearAuthToken() {
  window.localStorage.removeItem(authTokenStorageKey)
}

export async function login(
  username: string,
  password: string,
  signal?: AbortSignal
) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
    signal,
  })

  if (!response.ok) {
    throw new Error("Login failed. Check your credentials and try again.")
  }

  const payload = (await response.json()) as LoginResponse
  setAuthToken(payload.token)

  return payload
}

export async function fetchLibraryPosts(signal?: AbortSignal) {
  const response = await fetch(`${apiBaseUrl}/posts`, { signal })

  if (!response.ok) {
    throw new Error(`Failed to load posts: ${response.status}`)
  }

  const payload = (await response.json()) as PostsResponse

  return payload.posts.map((post) => ({
    ...post,
    assetUrl: resolveAssetUrl(post.assetUrl),
  }))
}
