"use client"

import { useState, Suspense } from "react"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Crown, Sparkles, Github, ExternalLink, Loader2, QrCode, Image as ImageIcon, MessageSquare, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

type BillingPeriod = "monthly" | "quarterly" | "yearly"

const billingPlans: { id: BillingPeriod; name: string; price: string; priceCny: number; discount?: string }[] = [
  { id: "monthly", name: "月付", price: "$9.9", priceCny: 71 },
  { id: "quarterly", name: "季付", price: "$27", priceCny: 195, discount: "9% off" },
  { id: "yearly", name: "年付", price: "$89", priceCny: 640, discount: "25% off" },
]

const plans = [
  {
    name: "Free",
    description: "完美用于试用",
    price: "¥0",
    period: "永久",
    icon: Sparkles,
    color: "from-gray-500 to-slate-500",
    features: [
      "Markdown 转 Slidev",
      "实时幻灯片预览",
      "下载为 .md 文件",
      "所有基础主题",
      "无限演示文稿",
    ],
    cta: "开始使用",
    ctaLink: "/",
  },
  {
    name: "Pro",
    description: "适合高级用户",
    price: "$9.9",
    priceCny: "¥71",
    period: "/月起",
    icon: Crown,
    color: "from-blue-500 to-purple-500",
    popular: true,
    features: [
      "包含 Free 所有功能",
      "AI 布局优化 (Kimi K2.5)",
      "AI 图片生成 (智谱 CogView)",
      "聊天辅助功能",
      "优先支持",
      "新功能抢先体验",
    ],
    aiFeatures: [
      { icon: MessageSquare, text: "每月 1000万 tokens（约 50万 汉字）" },
      { icon: ImageIcon, text: "每月 1000 张 AI 生成图片" },
    ],
    cta: "升级到 Pro",
    pro: true,
  },
]

function PricingContent() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showBillingSelector, setShowBillingSelector] = useState(false)
  const [selectedBilling, setSelectedBilling] = useState<BillingPeriod>("monthly")
  const [paymentData, setPaymentData] = useState<{ qrcode: string; outTradeNo: string } | null>(null)
  const searchParams = useSearchParams()
  const payment = searchParams.get("payment")

  const handleSubscribe = async (billingPeriod: BillingPeriod) => {
    if (!session?.user) {
      signIn()
      return
    }

    setSelectedBilling(billingPeriod)
    setLoading(true)
    setShowPaymentModal(true)

    try {
      // 获取支付套餐信息
      const plansRes = await fetch("/api/payment/create-order")
      const { plans: availablePlans } = await plansRes.json()
      const selectedPlan = availablePlans.find((p: any) => p.id === billingPeriod)

      // 创建支付订单
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedPlan?.priceCny || 71,
          billingPeriod,
          method: "payjs",
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "创建支付订单失败")
      }

      const data = await res.json()
      setPaymentData(data)
    } catch (error) {
      console.error("支付错误:", error)
      alert(error instanceof Error ? error.message : "创建支付订单失败")
      setShowPaymentModal(false)
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
                <h1 className="text-xl font-bold">定价</h1>
                <p className="text-sm text-muted-foreground">选择您的计划</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">返回应用</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Success/Error Messages */}
      {payment === "success" && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-green-100 dark:bg-green-900 border border-green-400 text-green-700 dark:text-green-200 px-4 py-3 rounded">
            支付成功！您的 Pro 订阅现已激活。
          </div>
        </div>
      )}
      {payment === "failed" && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            支付失败。请稍后重试或联系客服。
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">简单透明的价格</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            免费开始，需要 AI 超能力时再升级。无隐藏费用，随时取消。
            <br />
            <span className="text-sm text-muted-foreground">
              支持微信支付、支付宝
            </span>
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
                    最受欢迎
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
                  {plan.pro ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{billingPlans.find(p => p.id === selectedBilling)?.price}</span>
                      <span className="text-muted-foreground">
                        {selectedBilling === "monthly" ? "/月" : selectedBilling === "quarterly" ? "/季" : "/年"}
                      </span>
                      {billingPlans.find(p => p.id === selectedBilling)?.discount && (
                        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                          {billingPlans.find(p => p.id === selectedBilling)?.discount}
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </>
                  )}
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

                {/* Billing Period Selector for Pro */}
                {plan.pro && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">选择计费周期:</label>
                    <div className="relative">
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setShowBillingSelector(!showBillingSelector)}
                      >
                        <span>{billingPlans.find(p => p.id === selectedBilling)?.name} - {billingPlans.find(p => p.id === selectedBilling)?.price} (¥{billingPlans.find(p => p.id === selectedBilling)?.priceCny})</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      {showBillingSelector && (
                        <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg">
                          {billingPlans.map((billing) => (
                            <button
                              key={billing.id}
                              className="w-full px-4 py-2 text-left hover:bg-muted flex items-center justify-between"
                              onClick={() => {
                                setSelectedBilling(billing.id)
                                setShowBillingSelector(false)
                              }}
                            >
                              <span>{billing.name} - {billing.price} (¥{billing.priceCny})</span>
                              {billing.discount && (
                                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                                  {billing.discount}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Features Details for Pro */}
                {plan.aiFeatures && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium">AI 配额:</p>
                    {plan.aiFeatures.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <feature.icon className="h-4 w-4" />
                        <span>{feature.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {plan.pro ? (
                  <Button
                    className="w-full"
                    size="lg"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(selectedBilling)}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      plan.cta
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
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">常见问题</h3>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Free 和 Pro 有什么区别？</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Free 用户可以将 Markdown 转换为 Slidev 并预览幻灯片。Pro 用户获得 AI 驱动的功能，
                  如布局优化和图片生成，让演示文稿更加专业。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">可以随时取消吗？</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  是的！您可以随时取消订阅。在当前计费周期结束前，您将继续享受 Pro 服务。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">包含哪些 AI 功能？</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Pro 订阅者获得 AI 驱动的布局优化，让幻灯片看起来专业；AI 图片生成，
                  为演示文稿添加视觉元素；以及聊天辅助，帮助内容创作和编辑。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">支持哪些支付方式？</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  我们支持微信支付和支付宝。所有交易都通过安全加密处理。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && paymentData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                扫码支付
              </CardTitle>
              <CardDescription>
                请使用微信或支付宝扫描二维码完成支付
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={paymentData.qrcode}
                  alt="Payment QR Code"
                  className="w-64 h-64 border rounded-lg"
                />
              </div>
              <div className="text-center text-sm text-muted-foreground">
                <p>订单号: {paymentData.outTradeNo}</p>
                <p className="mt-2">支付完成后页面将自动刷新</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPaymentModal(false)
                    window.location.reload()
                  }}
                >
                  取消
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => window.location.reload()}
                >
                  我已支付
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Slidev Converter • 属于{" "}
            <Link
              href="https://github.com/SakuyaInazaki/Slidev-skills"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Slidev Skills
            </Link>{" "}
            的一部分 • 用 ❤️ 制作
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
        <div className="text-muted-foreground">加载中...</div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}
