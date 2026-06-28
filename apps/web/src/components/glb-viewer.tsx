import * as React from "react"
import "@google/model-viewer"
import { ArrowsClockwise, Cube, Spinner } from "@phosphor-icons/react"

import { Button } from "@workspace/ui/components/button"

type GlbViewerProps = {
  src: string
  alt: string
}

type ModelViewerElement = HTMLElement & {
  src: string
}

class ViewerErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[28rem] flex-col items-center justify-center gap-3 border border-border/60 bg-muted/20 px-4 text-center">
          <Cube className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            The 3D preview could not be loaded.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

export function GlbViewer({ src, alt }: GlbViewerProps) {
  const [resetToken, setResetToken] = React.useState(0)
  const [isLoaded, setIsLoaded] = React.useState(false)
  const viewerRef = React.useRef<ModelViewerElement | null>(null)

  React.useEffect(() => {
    setIsLoaded(false)

    const viewer = viewerRef.current
    if (!viewer) {
      return undefined
    }

    const handleLoad = () => {
      setIsLoaded(true)
    }

    const handleError = () => {
      setIsLoaded(true)
    }

    viewer.addEventListener("load", handleLoad)
    viewer.addEventListener("error", handleError)

    return () => {
      viewer.removeEventListener("load", handleLoad)
      viewer.removeEventListener("error", handleError)
    }
  }, [src])

  return (
    <div className="overflow-hidden border border-border/60 bg-muted/10">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2 tracking-[0.22em] uppercase">
          <Cube className="size-4" />
          {alt}
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setResetToken((current) => current + 1)}
        >
          <ArrowsClockwise />
          Reset view
        </Button>
      </div>

      <div
        key={resetToken}
        className="relative h-[20rem] w-full bg-muted/10 sm:h-[28rem]"
      >
        <ViewerErrorBoundary>
          {React.createElement("model-viewer", {
            ref: viewerRef,
            src,
            alt,
            "camera-controls": true,
            "touch-action": "pan-y",
            "interaction-prompt": "none",
            "shadow-intensity": "1",
            exposure: "1",
            "camera-target": "auto auto auto",
            "camera-orbit": "0deg 75deg auto",
            "min-camera-orbit": "auto auto auto",
            "max-camera-orbit": "auto auto auto",
            "field-of-view": "auto",
            "min-field-of-view": "20deg",
            "max-field-of-view": "90deg",
            className: "block h-full w-full",
          })}

          {!isLoaded ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/75 text-sm text-muted-foreground backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-none border border-border bg-background px-3 py-2 shadow-sm">
                <Spinner className="size-4 animate-spin" />
                Preparing 3D preview...
              </div>
            </div>
          ) : null}
        </ViewerErrorBoundary>
      </div>
    </div>
  )
}
