"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Github, Presentation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AuthMode = "signin" | "signup"

export function LoginClient({ callbackUrl }: { callbackUrl: string }) {
  const [mode, setMode] = useState<AuthMode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCredentials = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const trimmedEmail = email.trim().toLowerCase()

    if (mode === "signup") {
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          name: name.trim(),
        }),
      })

      if (!registerRes.ok) {
        const data = await registerRes.json().catch(() => ({}))
        setError(data.error || "注册失败，请稍后重试")
        setIsSubmitting(false)
        return
      }
    }

    const result = await signIn("credentials", {
      email: trimmedEmail,
      password,
      redirect: false,
      callbackUrl,
    })

    if (!result?.ok) {
      setError(mode === "signup" ? "注册成功但登录失败，请重试" : "邮箱或密码错误")
      setIsSubmitting(false)
      return
    }

    window.location.href = result.url || callbackUrl
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 bg-primary/10 p-3 rounded-full w-fit">
            <Presentation className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Slidev Converter</CardTitle>
          <CardDescription>
            Sign in to create beautiful presentations with AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => signIn("github", { callbackUrl })}
            variant="outline"
            className="w-full"
            size="lg"
            type="button"
          >
            <Github className="h-5 w-5 mr-2" />
            Continue with GitHub
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex-1 h-px bg-border" />
            or use email
            <span className="flex-1 h-px bg-border" />
          </div>

          <form className="space-y-3" onSubmit={handleCredentials}>
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Your name"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup")
                setError(null)
              }}
              className="text-primary hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </div>

          <div className="text-center text-xs text-muted-foreground pt-2">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
