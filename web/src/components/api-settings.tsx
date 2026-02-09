"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Key, Check, X, Eye, EyeOff, Zap } from "lucide-react"

interface ApiSettingsProps {
  onKimiKeyChange?: (key: string) => void
  onZhipuKeyChange?: (key: string) => void
  onSiliconFlowKeyChange?: (key: string) => void
}

export function ApiSettings({
  onKimiKeyChange,
  onZhipuKeyChange,
  onSiliconFlowKeyChange,
}: ApiSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [kimiKey, setKimiKey] = useState("")
  const [zhipuKey, setZhipuKey] = useState("")
  const [siliconFlowKey, setSiliconFlowKey] = useState("")
  const [showKeys, setShowKeys] = useState(false)
  const [kimiStatus, setKimiStatus] = useState<"none" | "valid" | "invalid">("none")
  const [zhipuStatus, setZhipuStatus] = useState<"none" | "valid" | "invalid">("none")
  const [siliconFlowStatus, setSiliconFlowStatus] = useState<"none" | "valid" | "invalid">("none")

  // Load keys from localStorage on mount
  useEffect(() => {
    const savedKimi = localStorage.getItem("kimi-api-key")
    const savedZhipu = localStorage.getItem("zhipu-api-key")
    const savedSiliconFlow = localStorage.getItem("siliconflow-api-key")
    if (savedKimi) {
      setKimiKey(savedKimi)
      setKimiStatus("valid")
    }
    if (savedZhipu) {
      setZhipuKey(savedZhipu)
      setZhipuStatus("valid")
    }
    if (savedSiliconFlow) {
      setSiliconFlowKey(savedSiliconFlow)
      setSiliconFlowStatus("valid")
    }
  }, [])

  const saveKimiKey = () => {
    if (kimiKey.trim()) {
      localStorage.setItem("kimi-api-key", kimiKey.trim())
      setKimiStatus("valid")
      onKimiKeyChange?.(kimiKey.trim())
    } else {
      localStorage.removeItem("kimi-api-key")
      setKimiStatus("none")
    }
  }

  const saveZhipuKey = () => {
    if (zhipuKey.trim()) {
      localStorage.setItem("zhipu-api-key", zhipuKey.trim())
      setZhipuStatus("valid")
      onZhipuKeyChange?.(zhipuKey.trim())
    } else {
      localStorage.removeItem("zhipu-api-key")
      setZhipuStatus("none")
    }
  }

  const saveSiliconFlowKey = () => {
    if (siliconFlowKey.trim()) {
      localStorage.setItem("siliconflow-api-key", siliconFlowKey.trim())
      setSiliconFlowStatus("valid")
      onSiliconFlowKeyChange?.(siliconFlowKey.trim())
    } else {
      localStorage.removeItem("siliconflow-api-key")
      setSiliconFlowStatus("none")
    }
  }

  const clearKimiKey = () => {
    setKimiKey("")
    localStorage.removeItem("kimi-api-key")
    setKimiStatus("none")
  }

  const clearZhipuKey = () => {
    setZhipuKey("")
    localStorage.removeItem("zhipu-api-key")
    setZhipuStatus("none")
  }

  const clearSiliconFlowKey = () => {
    setSiliconFlowKey("")
    localStorage.removeItem("siliconflow-api-key")
    setSiliconFlowStatus("none")
  }

  const getStatusIcon = (status: "none" | "valid" | "invalid") => {
    switch (status) {
      case "valid":
        return <Check className="h-4 w-4 text-green-500" />
      case "invalid":
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <Key className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Settings className="h-4 w-4" />
        API 设置
      </Button>
    )
  }

  return (
    <Card className="fixed top-20 right-4 z-40 w-96 shadow-xl border-2 max-h-[80vh] overflow-y-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">API 设置</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          API 密钥是可选的。使用您自己的密钥或留空以使用提供的付费服务。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Kimi/Moonshot API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              {getStatusIcon(kimiStatus)}
              <Zap className="h-3 w-3 text-orange-500" />
              Kimi API Key
            </label>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowKeys(!showKeys)}
            >
              {showKeys ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <input
              type={showKeys ? "text" : "password"}
              value={kimiKey}
              onChange={(e) => setKimiKey(e.target.value)}
              placeholder="sk-..."
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {kimiKey ? (
              <>
                <Button size="sm" variant="outline" onClick={clearKimiKey}>
                  清除
                </Button>
                <Button size="sm" onClick={saveKimiKey}>
                  保存
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={saveKimiKey} disabled={!kimiKey.trim()}>
                保存
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            用于布局优化和聊天辅助（¥2/M tokens）。在{" "}
            <a
              href="https://platform.moonshot.cn/console/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              platform.moonshot.cn
            </a>{" "}
            获取您的密钥
          </p>
        </div>

        {/* Zhipu AI API Key */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              {getStatusIcon(zhipuStatus)}
              智谱 AI API Key
            </label>
          </div>
          <div className="flex gap-2">
            <input
              type={showKeys ? "text" : "password"}
              value={zhipuKey}
              onChange={(e) => setZhipuKey(e.target.value)}
              placeholder="您的智谱 API 密钥"
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {zhipuKey ? (
              <>
                <Button size="sm" variant="outline" onClick={clearZhipuKey}>
                  清除
                </Button>
                <Button size="sm" onClick={saveZhipuKey}>
                  保存
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={saveZhipuKey} disabled={!zhipuKey.trim()}>
                保存
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            用于 AI 图片生成（0.018元/张）。在{" "}
            <a
              href="https://open.bigmodel.cn/usercenter/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              open.bigmodel.cn
            </a>{" "}
            获取您的密钥
          </p>
        </div>

        {/* SiliconFlow API Key */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              {getStatusIcon(siliconFlowStatus)}
              SiliconFlow API Key
            </label>
          </div>
          <div className="flex gap-2">
            <input
              type={showKeys ? "text" : "password"}
              value={siliconFlowKey}
              onChange={(e) => setSiliconFlowKey(e.target.value)}
              placeholder="您的 SiliconFlow 密钥"
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {siliconFlowKey ? (
              <>
                <Button size="sm" variant="outline" onClick={clearSiliconFlowKey}>
                  清除
                </Button>
                <Button size="sm" onClick={saveSiliconFlowKey}>
                  保存
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={saveSiliconFlowKey} disabled={!siliconFlowKey.trim()}>
                保存
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            备用图片生成服务。在{" "}
            <a
              href="https://cloud.siliconflow.cn/account/ak"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              cloud.siliconflow.cn
            </a>{" "}
            获取您的密钥
          </p>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 您的 API 密钥永远不会发送到我们的服务器。它们存储在您的浏览器本地，并直接用于向相应的 API 发出请求。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
