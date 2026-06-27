import {
  BookmarkSimple,
  ChatCircle,
  Heart,
  ShareNetwork,
} from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import type { LibraryPost } from "@/lib/library-data"

import { GlbViewer } from "./glb-viewer"

function formatPublishedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

type PostProps = {
  post: LibraryPost
}

export function Post({ post }: PostProps) {
  return (
    <Card className="overflow-hidden border-border/70 bg-background/90 shadow-[0_12px_60px_rgba(0,0,0,0.08)]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{post.title}</CardTitle>
            <CardDescription>
              {post.author} · {formatPublishedAt(post.createdAt)} ·{" "}
              {post.mediaType === "model" ? "3D scan" : "photo"}
            </CardDescription>
          </div>

          <span className="rounded-none border border-border bg-muted px-2.5 py-1 text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            {post.mediaType}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {post.mediaType === "photo" ? (
          <div className="overflow-hidden border border-border/60 bg-muted/20">
            <img
              src={post.assetUrl}
              alt={post.title}
              className="h-[480px] w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <GlbViewer src={post.assetUrl} alt={post.title} />
        )}

        <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          {post.caption}
        </p>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Heart />
            {post.stats.likes}
          </Button>
          <Button variant="outline" size="sm">
            <ChatCircle />
            {post.stats.comments}
          </Button>
          <Button variant="outline" size="sm">
            <BookmarkSimple />
            {post.stats.saves}
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="sm:ml-auto">
          <ShareNetwork />
          Share
        </Button>
      </CardFooter>
    </Card>
  )
}
