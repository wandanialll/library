import { useEffect, useRef, useState, type ChangeEvent } from "react"

import { Post } from "@/components/post.component.tsx"
import { PostDialog } from "@/components/dialog.component.tsx"
import { createLibraryPost, fetchLibraryPosts } from "@/lib/library-api"
import type { LibraryPost } from "@/lib/library-types"
import { Plus } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

type FeedProps = {
  isAuthenticated: boolean
  onLoginRequest: () => void
  onLogout: () => void
}

type PendingUpload = {
  mediaType: "photo" | "model"
  fileName: string
  dataUrl: string
}

export function Feed({ isAuthenticated, onLoginRequest, onLogout }: FeedProps) {
  const [posts, setPosts] = useState<LibraryPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  // replacing current dialog prompts with proper modal dialog. one dialog for both title and caption.
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [postTitle, setPostTitle] = useState("")
  const [postCaption, setPostCaption] = useState("")
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null)

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error("Failed to read selected file"))
      reader.readAsDataURL(file)
    })
  }

  function inferMediaType(file: File) {
    const lowerName = file.name.toLowerCase()

    if (file.type === "model/gltf-binary" || lowerName.endsWith(".glb")) {
      return "model" as const
    }

    return "photo" as const
  }

  function requestUpload() {
    if (!isAuthenticated) {
      onLoginRequest()
      return
    }

    setUploadMessage(null)
    uploadInputRef.current?.click()
  }

  async function handleUploadSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsUploading(true)
    setUploadMessage(null)

    try {
      const mediaType = inferMediaType(file)
      const dataUrl = await readFileAsDataUrl(file)
      const defaultTitle = file.name.replace(/\.[^.]+$/, "")
      setPostTitle(defaultTitle)
      setPostCaption("")
      setPendingUpload({
        mediaType,
        fileName: file.name,
        dataUrl,
      })
      setIsDialogOpen(true)
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : "Failed to prepare upload"
      )
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }

  async function handleSubmitPost() {
    if (!pendingUpload) {
      return
    }

    setIsUploading(true)
    setUploadMessage(null)

    try {
      const createdPost = await createLibraryPost({
        title:
          postTitle.trim() || pendingUpload.fileName.replace(/\.[^.]+$/, ""),
        caption: postCaption.trim(),
        mediaType: pendingUpload.mediaType,
        fileName: pendingUpload.fileName,
        dataUrl: pendingUpload.dataUrl,
      })

      setPosts((current) => [createdPost, ...current])
      setUploadMessage("Post published")
      setIsDialogOpen(false)
      setPendingUpload(null)
      setPostTitle("")
      setPostCaption("")
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : "Failed to create post"
      )
    } finally {
      setIsUploading(false)
    }
  }

  function handleDialogOpenChange(open: boolean) {
    setIsDialogOpen(open)

    if (!open && !isUploading) {
      setPendingUpload(null)
      setPostTitle("")
      setPostCaption("")
    }
  }

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
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,model/gltf-binary,.glb"
        className="hidden"
        onChange={handleUploadSelection}
      />

      <PostDialog
        isOpen={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        title={postTitle}
        caption={postCaption}
        isSubmitting={isUploading}
        onTitleChange={setPostTitle}
        onCaptionChange={setPostCaption}
        onSubmit={handleSubmitPost}
      />

      <section className="flex flex-col gap-4 rounded-none border border-border/70 bg-background/85 p-5 shadow-[0_18px_80px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-6 dark:bg-background/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs tracking-[0.32em] text-muted-foreground uppercase">
              Danial's Library
            </p>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Photos and scans.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Browse my library :D
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
              onClick={requestUpload}
              disabled={!isAuthenticated || isUploading}
            >
              Import scan
            </Button>
            <Button
              size="sm"
              disabled={!isAuthenticated || isUploading}
              onClick={requestUpload}
            >
              <Plus />
              {isUploading
                ? "Uploading..."
                : isAuthenticated
                  ? "New post"
                  : "Login to post"}
            </Button>
          </div>
        </div>
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

        {uploadMessage ? (
          <Card className="border-border/70 bg-background/80">
            <CardContent className="py-4 text-sm text-muted-foreground">
              <p>{uploadMessage}</p>
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
