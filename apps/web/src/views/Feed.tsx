import { useEffect, useState } from "react"

import { Post } from "@/components/post.component.tsx"
import { fetchLibraryPosts } from "@/lib/library-api"
import type { LibraryPost } from "@/lib/library-types"
import { Plus } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

type FeedProps = {
  isAuthenticated: boolean
  onLoginRequest: () => void
  onLogout: () => void
}

export function Feed({ isAuthenticated, onLoginRequest, onLogout }: FeedProps) {
  const [posts, setPosts] = useState<LibraryPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPosts() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const nextPosts = await fetchLibraryPosts(controller.signal)
        setPosts(nextPosts)
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load posts"
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadPosts()

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 rounded-none border border-border/70 bg-background/85 p-5 shadow-[0_18px_80px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-6 dark:bg-background/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs tracking-[0.32em] text-muted-foreground uppercase">
              Library
            </p>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Photos and scans, presented like a feed, with 3D models that you
              can rotate and zoom.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Connected to your live backend so posts, media, and auth all run
              through the same production data path.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Logout
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onLoginRequest}>
                Login
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Import scan
            </Button>
            <Button size="sm" disabled={!isAuthenticated}>
              <Plus />
              {isAuthenticated ? "New post" : "Login to post"}
            </Button>
          </div>
        </div>

        <Card className="border-border/60 bg-muted/30">
          <CardContent className="flex flex-wrap gap-4 py-4 text-xs text-muted-foreground">
            <span>
              {isLoading ? "Loading posts..." : `${posts.length} posts`}
            </span>
            <span>1 photo source</span>
            <span>1 GLB scan source</span>
            <span>
              {isAuthenticated ? "Uploader enabled" : "Read only mode"}
            </span>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6">
        {errorMessage ? (
          <Card className="border-dashed border-border/70 bg-background/80">
            <CardContent className="space-y-2 py-8 text-sm text-muted-foreground">
              <p>
                Feed is unavailable right now because the API request failed.
              </p>
              <p>{errorMessage}</p>
            </CardContent>
          </Card>
        ) : null}

        {posts.map((post) => (
          <Post key={post.id} post={post} />
        ))}
      </section>
    </div>
  )
}
