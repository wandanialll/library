export type LibraryMediaType = "photo" | "model"

export type LibraryPost = {
  id: string
  title: string
  caption: string
  author: string
  createdAt: string
  mediaType: LibraryMediaType
  assetUrl: string
  stats: {
    likes: number
    comments: number
    saves: number
  }
}
