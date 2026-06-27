import { useState } from "react"

import { login } from "@/lib/library-api"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type LoginViewProps = {
  onSuccess: () => void
}

export function LoginView({ onSuccess }: LoginViewProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await login(username, password)
      onSuccess()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4 py-10 sm:px-6">
      <Card className="w-full border-border/70 bg-background/90 shadow-[0_20px_90px_rgba(0,0,0,0.11)]">
        <CardHeader className="space-y-2">
          <p className="text-xs tracking-[0.28em] text-muted-foreground uppercase">
            Library Access
          </p>
          <CardTitle className="font-heading text-3xl">Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">
            Login to unlock protected upload and post creation actions.
          </p>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">Username</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-10 border border-border bg-background px-3 ring-offset-2 transition outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="admin"
                required
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10 border border-border bg-background px-3 ring-offset-2 transition outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="••••••••"
                required
              />
            </label>

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
