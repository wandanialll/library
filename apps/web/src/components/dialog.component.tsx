// reusable dialog component for title and caption input
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"

type PostDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  caption: string
  isSubmitting?: boolean
  onTitleChange: (value: string) => void
  onCaptionChange: (value: string) => void
  onSubmit: () => void
}

export function PostDialog({
  isOpen,
  onOpenChange,
  title,
  caption,
  isSubmitting = false,
  onTitleChange,
  onCaptionChange,
  onSubmit,
}: PostDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Post</DialogTitle>
          <DialogDescription>
            Please enter a title and caption for your post.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="post-title"
              className="block text-sm font-medium text-foreground"
            >
              Title
            </label>
            <input
              type="text"
              id="post-title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Give your post a title"
              className="mt-1 block w-full border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors outline-none focus:border-foreground/40"
            />
          </div>
          <div>
            <label
              htmlFor="post-caption"
              className="block text-sm font-medium text-foreground"
            >
              Caption
            </label>
            <textarea
              id="post-caption"
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              rows={4}
              placeholder="Add a short description"
              className="mt-1 block w-full resize-y border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors outline-none focus:border-foreground/40"
            />
          </div>
        </div>
        <DialogFooter showCloseButton>
          <Button onClick={onSubmit} disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? "Publishing..." : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
