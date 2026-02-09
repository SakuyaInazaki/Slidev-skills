import { LoginClient } from "./login-client"

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string | string[]
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined
  const rawCallbackUrl = params?.callbackUrl
  const callbackUrl =
    typeof rawCallbackUrl === "string" && rawCallbackUrl.length > 0 ? rawCallbackUrl : "/"

  return <LoginClient callbackUrl={callbackUrl} />
}
