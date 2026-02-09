"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Image, Zap } from "lucide-react"

interface UsageStats {
  planType: string
  hasAiAccess: boolean
  tokens: {
    limit: number
    used: number
    remaining: number
    percentage: number
  }
  images: {
    limit: number
    used: number
    remaining: number
    percentage: number
  }
  currentPeriodEnd: Date | null
}

interface UsageDashboardProps {
  userId: string | undefined
}

export function UsageDashboard({ userId }: UsageDashboardProps) {
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchUsage = async () => {
      try {
        const res = await fetch("/api/subscription")
        if (res.ok) {
          const data = await res.json()
          setUsage({
            planType: data.planType,
            hasAiAccess: data.hasAiAccess,
            tokens: {
              limit: data.monthlyTokens,
              used: data.tokensUsed,
              remaining: data.monthlyTokens - data.tokensUsed,
              percentage: data.monthlyTokens > 0
                ? (data.tokensUsed / data.monthlyTokens) * 100
                : 0,
            },
            images: {
              limit: data.imagesAllowed,
              used: data.imagesGenerated,
              remaining: data.imagesAllowed - data.imagesGenerated,
              percentage: data.imagesAllowed > 0
                ? (data.imagesGenerated / data.imagesAllowed) * 100
                : 0,
            },
            currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
          })
        }
      } catch (error) {
        console.error("Failed to fetch usage:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsage()
  }, [userId])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-2 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!usage || !usage.hasAiAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage
          </CardTitle>
          <CardDescription>
            Upgrade to Pro to track your AI usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            AI features are available for Pro subscribers.
          </p>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A"
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Usage
        </CardTitle>
        <CardDescription>
          Current period ends {formatDate(usage.currentPeriodEnd)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Token Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">Tokens</span>
            </div>
            <span className="text-muted-foreground">
              {usage.tokens.used.toLocaleString()} / {usage.tokens.limit.toLocaleString()}
            </span>
          </div>
          <Progress value={usage.tokens.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {usage.tokens.remaining.toLocaleString()} tokens remaining
          </p>
        </div>

        {/* Image Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Images</span>
            </div>
            <span className="text-muted-foreground">
              {usage.images.used} / {usage.images.limit}
            </span>
          </div>
          <Progress value={usage.images.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {usage.images.remaining} images remaining
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
