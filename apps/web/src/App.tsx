import { useEffect, useMemo, useState } from "react"

import { clearAuthToken, getAuthToken } from "@/lib/library-api"
import { LoginView } from "@/views/Login"
import { Feed } from "./views/Feed"

export function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [authToken, setAuthToken] = useState(() => getAuthToken())

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname)
      setAuthToken(getAuthToken())
    }

    window.addEventListener("popstate", onPopState)
    return () => {
      window.removeEventListener("popstate", onPopState)
    }
  }, [])

  const isAuthenticated = useMemo(() => Boolean(authToken), [authToken])

  function navigateTo(path: string, mode: "push" | "replace" = "push") {
    const nextUrl = new URL(path, window.location.origin)

    if (mode === "replace") {
      window.history.replaceState(null, "", nextUrl)
    } else {
      window.history.pushState(null, "", nextUrl)
    }

    setCurrentPath(nextUrl.pathname)
  }

  function handleLoginSuccess() {
    setAuthToken(getAuthToken())
    navigateTo("/", "replace")
  }

  function handleLogout() {
    clearAuthToken()
    setAuthToken(null)
    navigateTo("/login", "replace")
  }

  const isLoginPath = currentPath === "/login"

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(245,240,228,0.85)_42%,_rgba(228,223,214,0.92)_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top,_rgba(45,45,45,0.95),_rgba(28,28,28,0.98)_50%,_rgba(12,12,12,1)_100%)]">
      {isLoginPath ? (
        <LoginView onSuccess={handleLoginSuccess} />
      ) : (
        <Feed
          isAuthenticated={isAuthenticated}
          onLoginRequest={() => navigateTo("/login")}
          onLogout={handleLogout}
        />
      )}
    </main>
  )
}
