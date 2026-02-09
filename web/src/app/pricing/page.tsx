"use client"

import { useState, Suspense } from "react"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Crown, Sparkles, Github, ExternalLink, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

const plans = [
  {
    name: "Free",
    description: "Perfect for trying out",
    price: "$0",
    period: "forever",
    icon: Sparkles,
    color: "from-gray-500 to-slate-500",
    features: [
      "Markdown to Slidev conversion",
      "Live slide preview",
      "Download as .md file",
      "All basic themes",
      "Unlimited presentations",
    ],
    cta: "Get Started",
    ctaLink: "/",
  },
  {
    name: "Pro",
    description: "For power users",
    price: "$9.99",
    period: "/month",
    icon: Crown,
    color: "from-blue-500 to-purple-500",
    popular: true,
    features: [
      "Everything in Free",
      "AI layout optimization",
      "AI image generation",
      "Chat assistance",
      "Priority support",
      "Early access to new features",
    ],
    cta: "Upgrade to Pro",
    pro: true,
  },
]

function PricingContent() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const success = searchParams.get("success")
  const canceled = searchParams.get("canceled")

  const handleSubscribe = async () => {
    if (!session?.user) {
      signIn()
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create checkout session")
      }

      const { url } = await res.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert(error instanceof Error ? error.message : "Failed to proceed to checkout")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                  <Github className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold">Pricing</h1>
                <p className="text-sm text-muted-foreground">Choose your plan</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Back to App</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Success/Error Messages */}
      {success === "true" && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-green-100 dark:bg-green-900 border border-green-400 text-green-700 dark:text-green-200 px-4 py-3 rounded">
            Payment successful! Your Pro subscription is now active.
          </div>
        </div>
      )}
      {canceled === "true" && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 text-yellow-700 dark:text-yellow-200 px-4 py-3 rounded">
            Payment canceled. You can upgrade anytime from the app.
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Start for free, upgrade when you need AI superpowers. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? "border-2 border-primary shadow-lg scale-105"
                  : "border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${plan.color} text-white`}>
                      <plan.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.pro ? (
                  <Button
                    className="w-full"
                    size="lg"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={handleSubscribe}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {plan.cta}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href={plan.ctaLink || "/"}>
                      {plan.cta}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What's the difference between Free and Pro?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Free users can convert Markdown to Slidev and preview their slides. Pro users get AI-powered features
                  like layout optimization and image generation to make their presentations even better.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! You can cancel your subscription anytime. You'll continue to have access until the end of your billing period.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What AI features are included?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Pro subscribers get AI-powered layout optimization to make slides look professional, AI image generation
                  to add visuals to presentations, and chat assistance to help with content creation and editing.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Slidev Converter • Part of{" "}
            <Link
              href="https://github.com/SakuyaInazaki/Slidev-skills"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Slidev Skills
            </Link>{" "}
            • Made with ❤️
          </p>
        </div>
      </footer>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}
