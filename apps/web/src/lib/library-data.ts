import type { LibraryPost } from "./library-types"

export const libraryPosts: LibraryPost[] = [
  {
    id: "harbor-light-photo",
    title: "Harbor light study",
    caption:
      "A quiet photo test with soft shadows, intended to share the same feed structure as the scans so the app can handle both media types without special cases.",
    author: "Avery Moon",
    createdAt: "2026-06-18T09:30:00.000Z",
    mediaType: "photo",
    assetUrl: "/mock_data/nabm.png",
    stats: {
      likes: 84,
      comments: 12,
      saves: 19,
    },
  },
  {
    id: "scaniverse-entry",
    title: "Scaniverse room capture",
    caption:
      "This GLB scan is the core interaction case: a user should be able to orbit around the scene, zoom in on details, and inspect the scan like a normal post.",
    author: "Nadia Chen",
    createdAt: "2026-06-21T15:45:00.000Z",
    mediaType: "model",
    assetUrl: "/mock_data/Scaniverse%202025-12-28%20112635.glb",
    stats: {
      likes: 143,
      comments: 27,
      saves: 42,
    },
  },
]
