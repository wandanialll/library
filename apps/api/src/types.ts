export type MediaType = "photo" | "model"

export type PostStats = {
  likes: number
  comments: number
  saves: number
}

export type LibraryPost = {
  id: string
  title: string
  caption: string
  author: string
  createdAt: string
  mediaType: MediaType
  assetUrl: string
  stats: PostStats
}
