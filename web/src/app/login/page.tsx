import { LoginClient } from "./login-client"

type LoginPageProps = {
  searchParams?: {
    callbackUrl?: string | string[]
  }
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const rawCallbackUrl = searchParams?.callbackUrl
  const callbackUrl =
    typeof rawCallbackUrl === "string" && rawCallbackUrl.length > 0 ? rawCallbackUrl : "/"

  return <LoginClient callbackUrl={callbackUrl} />
}
