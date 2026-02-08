"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileText,
  Download,
  Sparkles,
  Settings,
  Eye,
  Moon,
  Sun,
  Github,
  ExternalLink,
  Presentation,
  Wand2,
  PanelLeft,
  PanelRight,
} from "lucide-react"
import { convertToSlidev, downloadSlides, THEMES, TRANSITIONS, type ConversionOptions } from "@/lib/converter"
import { ChatPanel, type Message } from "@/components/chat-panel"
import { ApiSettings } from "@/components/api-settings"
import { SlidePreview } from "@/components/slide-preview"

// Monaco editor is loaded dynamically
const MonacoEditor = dynamic(() => import("@/components/monaco-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg">
      <div className="text-muted-foreground">Loading editor...</div>
    </div>
  ),
})

import dynamic from "next/dynamic"

const SAMPLE_MARKDOWN = `# My Presentation

## Introduction

Welcome to this presentation about Slidev!

Slidev is a web-based slide deck builder for developers.

- Theme: seriph
- Background: https://sli.dev
- Syntax highlighting
- LaTeX math

## Features

What makes Slidev special?

- **Markdown-based**: Write slides in Markdown
- **Developer Friendly**: Code highlighting, diagrams
- **Themeable**: Beautiful built-in themes
- **Interactive**: Click animations, transitions

## Code Example

\`\`\`typescript
function greet(name: string) {
  console.log(\`Hello, \${name}!\`)
}

greet("Slidev")
\`\`\`

## Thank You

Questions?

---

@slidev
`

export default function Home() {
  const [input, setInput] = useState(SAMPLE_MARKDOWN)
  const [output, setOutput] = useState("")
  const [theme, setTheme] = useState("seriph")
  const [transition, setTransition] = useState("slide-left")
  const [title, setTitle] = useState("My Presentation")
  const [darkMode, setDarkMode] = useState(false)
  const [stats, setStats] = useState({ totalSlides: 0, hasCode: false, hasImages: false, hasDiagrams: false })

  // AI Features
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "assistant",
    content: "Hi! I'm your Slidev assistant. I can help you:\n\n• Optimize slide layouts\n• Generate images for your slides\n• Improve content and design\n\nJust ask me anything!",
    timestamp: new Date(),
  }])
  const [isProcessing, setIsProcessing] = useState(false)
  const [claudeApiKey, setClaudeApiKey] = useState("")
  const [replicateApiKey, setReplicateApiKey] = useState("")

  // View state
  const [showPreview, setShowPreview] = useState(true)
  const [activePanel, setActivePanel] = useState<"editor" | "preview">("editor")

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedClaude = localStorage.getItem("claude-api-key")
    const savedReplicate = localStorage.getItem("replicate-api-key")
    if (savedClaude) setClaudeApiKey(savedClaude)
    if (savedReplicate) setReplicateApiKey(savedReplicate)
  }, [])

  // Convert markdown to slidev
  const convert = () => {
    const options: ConversionOptions = {
      theme,
      title,
      transition,
    }

    const result = convertToSlidev(input, options)
    setOutput(result.slides)
    setStats(result.stats)
  }

  // Auto-convert on input change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      convert()
    }, 500)

    return () => clearTimeout(timer)
  }, [input, theme, transition, title])

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  const handleDownload = () => {
    downloadSlides(output, `${title.toLowerCase().replace(/\s+/g, "-")}-slides.md`)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output)
  }

  // Handle AI chat messages
  const handleSendMessage = useCallback(async (userMessage: string) => {
    // Add user message
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newUserMessage])
    setIsProcessing(true)

    try {
      // Build message history for Claude
      const claudeMessages = [
        ...messages.slice(-10).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user" as const,
          content: userMessage,
        },
      ]

      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: claudeMessages,
          apiKey: claudeApiKey || undefined, // Send undefined if not set, server will use env var
          slidevContent: output,
          originalMarkdown: input,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get response from Claude")
      }

      const data = await response.json()

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}. ${!claudeApiKey ? "\n\n💡 Tip: You can add your own API key in Settings, or contact support for access." : ""}`,
        timestamp: new Date(),
      }])
    } finally {
      setIsProcessing(false)
    }
  }, [claudeApiKey, messages, output, input])

  // Handle adding image to slide
  const handleAddImage = async (slideIndex: number) => {
    // Ask user what image they want
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "assistant",
      content: `What kind of image would you like to generate for slide ${slideIndex + 1}? Please describe the image you want.${!replicateApiKey ? "\n\n💡 You can add your own Replicate API key in Settings, or use the provided service." : ""}`,
      timestamp: new Date(),
    }])
  }

  // Handle upload image
  const handleUploadImage = async (slideIndex: number, file: File) => {
    // Convert to base64 and insert into the slide
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string

      // Insert image into the slide at slideIndex
      const slides = output.split(/^\n---\n$/m)
      if (slides[slideIndex]) {
        slides[slideIndex] += `\n\n![Uploaded image](${base64})`
        setOutput(slides.join("\n---\n"))
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Presentation className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Slidev Converter</h1>
                <p className="text-sm text-muted-foreground">Markdown to beautiful slides</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ApiSettings
                onClaudeKeyChange={setClaudeApiKey}
                onReplicateKeyChange={setReplicateApiKey}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? "Light mode" : "Dark mode"}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
                title="View on GitHub"
              >
                <a
                  href="https://github.com/SakuyaInazaki/Slidev-skills"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Settings Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Settings:</span>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="theme" className="text-sm text-muted-foreground">Theme</label>
                <Select
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-40"
                >
                  {THEMES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="transition" className="text-sm text-muted-foreground">Transition</label>
                <Select
                  id="transition"
                  value={transition}
                  onChange={(e) => setTransition(e.target.value)}
                  className="w-40"
                >
                  {TRANSITIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="title" className="text-sm text-muted-foreground">Title</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-48 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="text-sm text-muted-foreground flex items-center gap-3">
                  <span>{stats.totalSlides} slides</span>
                  {stats.hasCode && <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 rounded text-xs">Code</span>}
                  {stats.hasDiagrams && <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs">Diagrams</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 border-l pl-4">
                <Button
                  variant={showPreview ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editor, Output, Preview */}
        <div className={`grid gap-6 ${showPreview ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-2"}`}>
          {/* Input Panel */}
          <Card className={`${showPreview ? "h-[calc(100vh-280px)]" : "h-[calc(100vh-280px)]"} flex flex-col`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Markdown Input</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE_MARKDOWN)}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
              <CardDescription>Paste your Markdown here</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <MonacoEditor
                value={input}
                onChange={(value) => setInput(value || "")}
                language="markdown"
                className="h-full"
              />
            </CardContent>
          </Card>

          {/* Output Panel */}
          <Card className={`${showPreview ? "h-[calc(100vh-280px)]" : "h-[calc(100vh-280px)]"} flex flex-col`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Slidev Output</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    Copy
                  </Button>
                  <Button size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              <CardDescription>Converted Slidev format</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <MonacoEditor
                value={output}
                onChange={(value) => setOutput(value || "")}
                language="markdown"
                readOnly={false}
                className="h-full"
              />
            </CardContent>
          </Card>

          {/* Preview Panel */}
          {showPreview && (
            <div className="h-[calc(100vh-280px)]">
              <SlidePreview
                content={output}
                theme={theme}
                onAddImage={handleAddImage}
                onUploadImage={handleUploadImage}
              />
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Resources
            </CardTitle>
            <CardDescription>
              Learn more about Slidev and start creating presentations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" asChild>
                <a
                  href="https://stackblitz.com/github/slidevjs/slidev-starter"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Try on StackBlitz
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href="https://sli.dev/guide/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Docs
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href="https://sli.dev/install.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install Slidev
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Chat Panel */}
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        isProcessing={isProcessing}
        placeholder="Ask AI to optimize your slides..."
      />

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Slidev Converter • Part of{" "}
            <a
              href="https://github.com/SakuyaInazaki/Slidev-skills"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Slidev Skills
            </a>{" "}
            • Made with ❤️
          </p>
        </div>
      </footer>
    </div>
  )
}
