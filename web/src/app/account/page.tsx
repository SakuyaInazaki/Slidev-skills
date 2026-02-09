"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Crown, Sparkles, User, LogOut, Calendar, CreditCard, Zap, Image as ImageIcon, MessageSquare, CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AccountPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    const fetchSubscription = async () => {
      if (session?.user) {
        try {
          const res = await fetch("/api/subscription")
          if (res.ok) {
            const data = await res.json()
            setSubscription(data)
          }
        } catch (error) {
          console.error("Failed to fetch subscription:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchSubscription()
  }, [session])

  const handleCancelSubscription = async () => {
    if (!confirm("确定要取消订阅吗？将在当前计费周期结束后生效。")) {
      return
    }

    setCancelling(true)
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
      })

      if (res.ok) {
        const data = await res.json()
        setSubscription((prev: any) => ({ ...prev, cancelAtPeriodEnd: true }))
        alert(data.message || "订阅已标记为取消")
      }
    } catch (error) {
      alert("取消订阅失败，请稍后重试")
    } finally {
      setCancelling(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const isPro = subscription?.planType === "PRO"
  const isInTrial = subscription?.status === "TRIALING"
  const isCanceled = subscription?.cancelAtPeriodEnd

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const calculateDaysLeft = (endDateStr: string | null) => {
    if (!endDateStr) return null
    const now = new Date()
    const end = new Date(endDateStr)
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">账户设置</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* User Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-16 w-16 rounded-full"
                />
              )}
              <div>
                <CardTitle className="text-2xl">{session.user.name}</CardTitle>
                <CardDescription>{session.user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                退出登录
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card className={`mb-6 ${isPro ? "border-primary shadow-lg" : ""}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isPro ? "bg-gradient-to-br from-blue-500 to-purple-500" : "bg-muted"}`}>
                  {isPro ? <Crown className="h-6 w-6 text-white" /> : <User className="h-6 w-6" />}
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {isPro ? "Pro 订阅" : "Free 计划"}
                    {isInTrial && (
                      <span className="text-sm font-normal text-muted-foreground">(试用中)</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isPro ? "解锁所有 AI 功能" : "升级到 Pro 以使用 AI 功能"}
                  </CardDescription>
                </div>
              </div>
              {isPro && (
                <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm font-medium">
                  <Sparkles className="h-3 w-3" />
                  Active
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subscription Details */}
            {subscription && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">当前状态</p>
                  <p className="font-medium flex items-center gap-2">
                    {isCanceled ? (
                      <>
                        <XCircle className="h-4 w-4 text-orange-500" />
                        将于周期结束后取消
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {subscription.status === "TRIALING" ? "试用期" : "活跃"}
                      </>
                    )}
                  </p>
                </div>

                {subscription.currentPeriodEnd && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">周期结束日期</p>
                    <p className="font-medium">
                      {formatDate(subscription.currentPeriodEnd)}
                      {calculateDaysLeft(subscription.currentPeriodEnd) !== null && (
                        <span className="text-muted-foreground ml-2">
                          ({calculateDaysLeft(subscription.currentPeriodEnd)} 天后)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {subscription.trialEndsAt && isInTrial && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">试用期结束</p>
                    <p className="font-medium">{formatDate(subscription.trialEndsAt)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Usage Stats (for Pro users) */}
            {isPro && subscription && (
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-medium">本月配额使用情况</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        AI Tokens
                      </span>
                      <span className="text-muted-foreground">
                        {subscription.tokensUsed?.toLocaleString() || 0} / {(subscription.monthlyTokens || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((subscription.tokensUsed || 0) / (subscription.monthlyTokens || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="h-4 w-4" />
                        图片生成
                      </span>
                      <span className="text-muted-foreground">
                        {subscription.imagesGenerated || 0} / {subscription.imagesAllowed || 0}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((subscription.imagesGenerated || 0) / (subscription.imagesAllowed || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              {!isPro && (
                <Button asChild className="flex-1 md:flex-none">
                  <Link href="/pricing">
                    <Crown className="h-4 w-4 mr-2" />
                    升级到 Pro
                  </Link>
                </Button>
              )}

              {isPro && !isCanceled && (
                <Button
                  variant="outline"
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="flex-1 md:flex-none"
                >
                  {cancelling ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  取消订阅
                </Button>
              )}

              <Button
                variant="outline"
                asChild
                className="flex-1 md:flex-none"
              >
                <Link href="/pricing">
                  <Zap className="h-4 w-4 mr-2" />
                  查看计划
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>功能对比</CardTitle>
            <CardDescription>Free 和 Pro 计划的功能差异</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { feature: "Markdown 转 Slidev", free: true, pro: true },
                { feature: "实时预览", free: true, pro: true },
                { feature: "下载 .md 文件", free: true, pro: true },
                { feature: "所有内置主题", free: true, pro: true },
                { feature: "AI 布局优化", free: false, pro: true },
                { feature: "AI 图片生成", free: false, pro: true },
                { feature: "AI 聊天辅助", free: false, pro: true },
                { feature: "优先支持", free: false, pro: true },
              ].map((item) => (
                <div key={item.feature} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span>{item.feature}</span>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm ${item.free ? "text-green-600" : "text-muted-foreground"}`}>
                      {item.free ? <CheckCircle className="h-4 w-4 inline" /> : <XCircle className="h-4 w-4 inline" />}
                      Free
                    </span>
                    <span className={`text-sm ${item.pro ? "text-green-600" : "text-muted-foreground"}`}>
                      {item.pro ? <CheckCircle className="h-4 w-4 inline" /> : <XCircle className="h-4 w-4 inline" />}
                      Pro
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
