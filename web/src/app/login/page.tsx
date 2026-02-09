import { signIn } from "@/auth"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Presentation } from "lucide-react"

export default function LoginPage(props: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  // In Next.js 15, searchParams is a Promise
  // We'll use Suspense boundary in the future, but for now make it async
  return <LoginPageContent searchParams={props.searchParams} />
}

async function LoginPageContent({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const params = await searchParams

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
            onClick={() => signIn("github", { callbackUrl: params.callbackUrl || "/" })}
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
