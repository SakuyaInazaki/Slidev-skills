"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Search, ShieldAlert } from "lucide-react"

type Subscription = {
  planType: "FREE" | "PRO"
  status: "ACTIVE" | "CANCELED" | "TRIALING"
  hasAiAccess: boolean
  monthlyTokens: number
  tokensUsed: number
  imagesAllowed: number
  imagesGenerated: number
  trialEndsAt: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

type UserRow = {
  id: string
  name: string | null
  email: string | null
  createdAt: string
  subscription: Subscription | null
}

const DEFAULT_TOKENS = 10_000_000
const DEFAULT_IMAGES = 1000

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<UserRow[]>([])
  const [selected, setSelected] = useState<UserRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  const [planType, setPlanType] = useState<"FREE" | "PRO">("FREE")
  const [statusValue, setStatusValue] = useState<"ACTIVE" | "CANCELED" | "TRIALING">("ACTIVE")
  const [hasAiAccess, setHasAiAccess] = useState(false)
  const [monthlyTokens, setMonthlyTokens] = useState(DEFAULT_TOKENS)
  const [imagesAllowed, setImagesAllowed] = useState(DEFAULT_IMAGES)
  const [tokensUsed, setTokensUsed] = useState(0)
  const [imagesGenerated, setImagesGenerated] = useState(0)

  useEffect(() => {
    if (!selected) return
    const sub = selected.subscription
    setPlanType(sub?.planType || "FREE")
    setStatusValue(sub?.status || "ACTIVE")
    setHasAiAccess(sub?.hasAiAccess || false)
    setMonthlyTokens(sub?.monthlyTokens ?? DEFAULT_TOKENS)
    setImagesAllowed(sub?.imagesAllowed ?? DEFAULT_IMAGES)
    setTokensUsed(sub?.tokensUsed ?? 0)
    setImagesGenerated(sub?.imagesGenerated ?? 0)
  }, [selected])

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setForbidden(false)
    try {
      const res = await fetch(`/api/admin/users?query=${encodeURIComponent(query.trim())}`)
      if (res.status === 403) {
        setForbidden(true)
        setUsers([])
        setSelected(null)
        return
      }
      if (!res.ok) {
        throw new Error("无法获取用户列表")
      }
      const data = await res.json()
      setUsers(data.users || [])
      setSelected(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "查询失败")
    } finally {
      setLoading(false)
    }
  }

  const updateSubscription = async (payload: Record<string, any>) => {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selected.id,
          ...payload,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "更新失败")
      }
      const data = await res.json()
      const updated = {
        ...selected,
        subscription: data.subscription,
      }
      setSelected(updated)
      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败")
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Access Denied
            </CardTitle>
            <CardDescription>请先登录管理员账号。</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Admin Console</CardTitle>
            <CardDescription>搜索用户并调整订阅与配额</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Email or name"
              className="h-10 w-72 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
            {forbidden && (
              <span className="text-sm text-red-500">你没有管理员权限。</span>
            )}
            {error && !forbidden && <span className="text-sm text-red-500">{error}</span>}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Search Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {users.length === 0 && (
                <p className="text-sm text-muted-foreground">没有结果</p>
              )}
              {users.map((user) => (
                <button
                  key={user.id}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                    selected?.id === user.id ? "border-primary bg-primary/10" : "hover:border-primary/40"
                  }`}
                  onClick={() => setSelected(user)}
                >
                  <div className="font-medium">{user.name || "No name"}</div>
                  <div className="text-muted-foreground">{user.email || "No email"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {user.subscription?.planType || "FREE"} / {user.subscription?.status || "ACTIVE"}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Subscription</CardTitle>
              <CardDescription>选择用户后调整订阅与配额</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selected && (
                <p className="text-sm text-muted-foreground">请先从左侧选择用户。</p>
              )}

              {selected && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Plan</label>
                      <select
                        value={planType}
                        onChange={(e) => setPlanType(e.target.value as "FREE" | "PRO")}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="FREE">FREE</option>
                        <option value="PRO">PRO</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Status</label>
                      <select
                        value={statusValue}
                        onChange={(e) => setStatusValue(e.target.value as "ACTIVE" | "CANCELED" | "TRIALING")}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="TRIALING">TRIALING</option>
                        <option value="CANCELED">CANCELED</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={hasAiAccess}
                        onChange={(e) => setHasAiAccess(e.target.checked)}
                      />
                      Allow AI access
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Monthly Tokens</label>
                      <input
                        type="number"
                        value={monthlyTokens}
                        onChange={(e) => setMonthlyTokens(Number(e.target.value))}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Images Allowed</label>
                      <input
                        type="number"
                        value={imagesAllowed}
                        onChange={(e) => setImagesAllowed(Number(e.target.value))}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Tokens Used</label>
                      <input
                        type="number"
                        value={tokensUsed}
                        onChange={(e) => setTokensUsed(Number(e.target.value))}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Images Generated</label>
                      <input
                        type="number"
                        value={imagesGenerated}
                        onChange={(e) => setImagesGenerated(Number(e.target.value))}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateSubscription({
                          planType: "PRO",
                          status: "ACTIVE",
                          hasAiAccess: true,
                          monthlyTokens: monthlyTokens || DEFAULT_TOKENS,
                          imagesAllowed: imagesAllowed || DEFAULT_IMAGES,
                          resetUsage: true,
                          setPeriodMonths: 1,
                        })
                      }
                      disabled={saving}
                    >
                      Grant Pro (30 days)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateSubscription({
                          planType: "FREE",
                          status: "ACTIVE",
                          hasAiAccess: false,
                          monthlyTokens: 0,
                          imagesAllowed: 0,
                          resetUsage: true,
                        })
                      }
                      disabled={saving}
                    >
                      Set Free
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => updateSubscription({ resetUsage: true })}
                      disabled={saving}
                    >
                      Reset Usage
                    </Button>
                    <Button
                      onClick={() =>
                        updateSubscription({
                          planType,
                          status: statusValue,
                          hasAiAccess,
                          monthlyTokens,
                          imagesAllowed,
                          tokensUsed,
                          imagesGenerated,
                        })
                      }
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
