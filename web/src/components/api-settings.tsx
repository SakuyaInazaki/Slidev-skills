"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Key, Check, X, Eye, EyeOff } from "lucide-react"

interface ApiSettingsProps {
  onClaudeKeyChange?: (key: string) => void
  onReplicateKeyChange?: (key: string) => void
}

export function ApiSettings({ onClaudeKeyChange, onReplicateKeyChange }: ApiSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [claudeKey, setClaudeKey] = useState("")
  const [replicateKey, setReplicateKey] = useState("")
  const [showKeys, setShowKeys] = useState(false)
  const [claudeStatus, setClaudeStatus] = useState<"none" | "valid" | "invalid">("none")
  const [replicateStatus, setReplicateStatus] = useState<"none" | "valid" | "invalid">("none")

  // Load keys from localStorage on mount
  useEffect(() => {
    const savedClaude = localStorage.getItem("claude-api-key")
    const savedReplicate = localStorage.getItem("replicate-api-key")
    if (savedClaude) {
      setClaudeKey(savedClaude)
      setClaudeStatus("valid")
    }
    if (savedReplicate) {
      setReplicateKey(savedReplicate)
      setReplicateStatus("valid")
    }
  }, [])

  const saveClaudeKey = () => {
    if (claudeKey.trim()) {
      localStorage.setItem("claude-api-key", claudeKey.trim())
      setClaudeStatus("valid")
      onClaudeKeyChange?.(claudeKey.trim())
    } else {
      localStorage.removeItem("claude-api-key")
      setClaudeStatus("none")
    }
  }

  const saveReplicateKey = () => {
    if (replicateKey.trim()) {
      localStorage.setItem("replicate-api-key", replicateKey.trim())
      setReplicateStatus("valid")
      onReplicateKeyChange?.(replicateKey.trim())
    } else {
      localStorage.removeItem("replicate-api-key")
      setReplicateStatus("none")
    }
  }

  const clearClaudeKey = () => {
    setClaudeKey("")
    localStorage.removeItem("claude-api-key")
    setClaudeStatus("none")
  }

  const clearReplicateKey = () => {
    setReplicateKey("")
    localStorage.removeItem("replicate-api-key")
    setReplicateStatus("none")
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
        API Settings
      </Button>
    )
  }

  return (
    <Card className="fixed top-20 right-4 z-40 w-96 shadow-xl border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">API Settings</CardTitle>
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
          Configure your API keys for AI features. Keys are stored locally in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Claude API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              {getStatusIcon(claudeStatus)}
              Claude API Key
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
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {claudeKey ? (
              <>
                <Button size="sm" variant="outline" onClick={clearClaudeKey}>
                  Clear
                </Button>
                <Button size="sm" onClick={saveClaudeKey}>
                  Save
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={saveClaudeKey} disabled={!claudeKey.trim()}>
                Save
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Used for layout optimization and chat assistance. Get your key at{" "}
            <a
              href="https://console.anthropic.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              console.anthropic.com
            </a>
          </p>
        </div>

        {/* Replicate API Key */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              {getStatusIcon(replicateStatus)}
              Replicate API Key
            </label>
          </div>
          <div className="flex gap-2">
            <input
              type={showKeys ? "text" : "password"}
              value={replicateKey}
              onChange={(e) => setReplicateKey(e.target.value)}
              placeholder="r8_..."
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {replicateKey ? (
              <>
                <Button size="sm" variant="outline" onClick={clearReplicateKey}>
                  Clear
                </Button>
                <Button size="sm" onClick={saveReplicateKey}>
                  Save
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={saveReplicateKey} disabled={!replicateKey.trim()}>
                Save
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Used for AI image generation (Flux.1). Get your key at{" "}
            <a
              href="https://replicate.com/account/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              replicate.com
            </a>
          </p>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Your API keys are never sent to our servers. They are stored locally in your browser
            and used directly to make requests to the respective APIs.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
