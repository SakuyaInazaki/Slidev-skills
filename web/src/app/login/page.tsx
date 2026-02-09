"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Presentation } from "lucide-react"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

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
          >
            <Github className="h-5 w-5 mr-2" />
            Continue with GitHub
          </Button>

          <div className="text-center text-sm text-muted-foreground pt-4">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
