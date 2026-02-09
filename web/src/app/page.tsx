"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
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
  LogOut,
  User,
  Crown,
  Zap,
} from "lucide-react"
import { convertToSlidev, downloadSlides, THEMES, TRANSITIONS, type ConversionOptions } from "@/lib/converter"
import { ChatPanel, type Message } from "@/components/chat-panel"
import { ApiSettings } from "@/components/api-settings"
import { SlidePreview } from "@/components/slide-preview"
import { UsageDashboard } from "@/components/usage-dashboard"

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

const INTENT_KEYWORDS = [
  "优化", "改", "调整", "润色", "重写", "生成", "制作", "帮我", "请帮", "布局", "排版",
  "图片", "配色", "动画", "主题", "结构", "逻辑", "拆分", "总结", "转成", "转换",
  "slidev", "markdown", "ppt", "演示", "幻灯片",
  "optimize", "improve", "rewrite", "generate", "design", "layout",
]

const SLIDEV_LAYOUTS = [
  "cover",
  "center",
  "default",
  "intro",
  "section",
  "two-cols",
  "image-right",
  "image-left",
  "image",
  "statement",
  "quote",
  "iframe",
]

const SLIDEV_SLIDE_KEYS = ["layout", "class", "background", "transition"]
const SLIDEV_SLIDE_KEY_SET = new Set(SLIDEV_SLIDE_KEYS)
const SLIDEV_BLOCK_START = "<<<SLIDEV>>>"
const SLIDEV_BLOCK_END = "<<<END_SLIDEV>>>"
const SLIDEV_DECK_KEYS = new Set([
  "theme",
  "title",
  "info",
  "author",
  "description",
  "keywords",
  "transition",
  "class",
  "favicon",
  "download",
  "downloadfilename",
  "exportfilename",
  "colorschema",
  "fonts",
  "themeconfig",
  "highlighter",
  "linenumbers",
  "presenter",
  "record",
  "defaults",
  "canvaswidth",
  "remote",
])

function hasExplicitIntent(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return false
  const lowered = trimmed.toLowerCase()
  return INTENT_KEYWORDS.some((keyword) => lowered.includes(keyword))
}

function shouldCallAI(text: string) {
  return hasExplicitIntent(text)
}

function parseKeyValue(line: string) {
  const trimmed = line.trim()
  if (!/^[A-Za-z]/.test(trimmed)) return null
  const match = trimmed.match(/^([A-Za-z][\w-]*):\s*(.+)$/)
  if (!match) return null
  return { key: match[1], value: match[2] }
}

function normalizeNewlines(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}

function scoreMarkdownContent(content: string, lang: string) {
  let score = 0
  if (["markdown", "md", "mdx", "slidev"].includes(lang)) score += 3
  if (/^---$/m.test(content)) score += 2
  if (/^layout:/m.test(content)) score += 1
  if (/^theme:/m.test(content)) score += 1
  if (/#\s+/.test(content)) score += 1
  score += Math.min(content.length / 500, 4)
  return score
}

function extractMarkdownFromResponse(response: string) {
  const startIndex = response.indexOf(SLIDEV_BLOCK_START)
  if (startIndex >= 0) {
    const endIndex = response.indexOf(SLIDEV_BLOCK_END, startIndex + SLIDEV_BLOCK_START.length)
    if (endIndex > startIndex) {
      const content = response
        .slice(startIndex + SLIDEV_BLOCK_START.length, endIndex)
        .trim()
      if (content.length) return content
    }
  }

  const lines = normalizeNewlines(response).split("\n")
  const candidates: { content: string; lang: string; score: number }[] = []

  for (let i = 0; i < lines.length; i++) {
    const startMatch = lines[i].trim().match(/^(```+|~~~+)\s*(\S+)?\s*$/)
    if (!startMatch) continue
    const fence = startMatch[1]
    const lang = (startMatch[2] || "").toLowerCase()

    // prefer markdown-ish fences; still allow others as fallback
    let endIndex = -1
    for (let j = lines.length - 1; j > i; j--) {
      if (lines[j].trim() === fence) {
        endIndex = j
        break
      }
    }

    const content = lines.slice(i + 1, endIndex === -1 ? lines.length : endIndex).join("\n").trim()
    if (!content) continue
    candidates.push({
      content,
      lang,
      score: scoreMarkdownContent(content, lang),
    })
  }

  if (candidates.length) {
    const sorted = [...candidates].sort((a, b) => b.score - a.score)
    return sorted[0].content || null
  }

  const startIndex = lines.findIndex((line) => {
    const trimmed = line.trim()
    if (!trimmed) return false
    if (trimmed === "---") return true
    return /^theme:|^title:|^layout:/i.test(trimmed)
  })

  if (startIndex === -1) return null
  const content = lines.slice(startIndex).join("\n").trim()
  return content.length ? content : null
}

function extractDeckFrontmatter(markdown: string) {
  const lines = normalizeNewlines(markdown).split("\n")
  let idx = 0
  while (idx < lines.length && lines[idx].trim() === "") idx++

  let frontmatterLines: string[] = []
  if (idx < lines.length && lines[idx].trim() === "---") {
    idx++
    while (idx < lines.length && lines[idx].trim() !== "---") {
      frontmatterLines.push(lines[idx])
      idx++
    }
    if (idx < lines.length && lines[idx].trim() === "---") {
      idx++
    }
  } else {
    let temp = idx
    const candidate: string[] = []
    while (temp < lines.length) {
      const line = lines[temp]
      if (line.trim() === "") break
      const kv = parseKeyValue(line)
      if (!kv) break
      candidate.push(line)
      temp++
    }
    const hasDeckKey = candidate.some((line) => {
      const kv = parseKeyValue(line)
      return kv ? SLIDEV_DECK_KEYS.has(kv.key.toLowerCase()) : false
    })
    if (candidate.length && hasDeckKey) {
      frontmatterLines = candidate
      idx = temp
    }
  }

  return {
    frontmatterLines,
    bodyLines: lines.slice(idx),
  }
}

function parseSlides(lines: string[]) {
  const slides: { frontmatter: string[]; content: string[] }[] = []
  let idx = 0

  while (idx < lines.length) {
    while (idx < lines.length && lines[idx].trim() === "") idx++
    if (idx >= lines.length) break

    let frontmatter: string[] = []
    let content: string[] = []

    if (lines[idx].trim() === "---") {
      idx++
      while (idx < lines.length && lines[idx].trim() !== "---") {
        frontmatter.push(lines[idx])
        idx++
      }
      if (idx < lines.length && lines[idx].trim() === "---") idx++
    } else {
      let temp = idx
      const candidate: string[] = []
      while (temp < lines.length) {
        const line = lines[temp]
        if (line.trim() === "") break
        const kv = parseKeyValue(line)
        if (!kv) break
        candidate.push(line)
        temp++
      }

      const hasSlideKey = candidate.some((line) => {
        const kv = parseKeyValue(line)
        return kv ? SLIDEV_SLIDE_KEY_SET.has(kv.key.toLowerCase()) : false
      })

      if (candidate.length && hasSlideKey) {
        frontmatter = candidate
        idx = temp
        if (lines[idx]?.trim() === "---") idx++
      }
    }

    let inCode = false
    let fence = ""
    while (idx < lines.length) {
      const raw = lines[idx]
      const trimmed = raw.trim()
      const fenceMatch = trimmed.match(/^(```+|~~~+)/)
      if (fenceMatch) {
        if (!inCode) {
          inCode = true
          fence = fenceMatch[1]
        } else if (trimmed.startsWith(fence)) {
          inCode = false
          fence = ""
        }
        content.push(raw)
        idx++
        continue
      }

      if (!inCode && trimmed === "---") {
        idx++
        break
      }

      content.push(raw)
      idx++
    }

    slides.push({ frontmatter, content })
  }

  return slides
}

function normalizeSlideBlock(
  slide: { frontmatter: string[]; content: string[] },
  prependKeys: string[] = []
) {
  const known: Record<string, string> = {}
  const others: string[] = []

  const pushKnown = (key: string, value: string) => {
    if (!value) return
    known[key] = value
  }

  slide.frontmatter.forEach((line) => {
    const kv = parseKeyValue(line)
    if (!kv) {
      if (line.trim()) others.push(line.trim())
      return
    }
    const key = kv.key.toLowerCase()
    const value = kv.value.trim()
    if (SLIDEV_SLIDE_KEY_SET.has(key)) {
      pushKnown(key, value)
    } else if (value) {
      others.push(`${kv.key}: ${value}`)
    }
  })

  prependKeys.forEach((line) => {
    const kv = parseKeyValue(line)
    if (!kv) return
    const key = kv.key.toLowerCase()
    if (!known[key]) {
      pushKnown(key, kv.value.trim())
    }
  })

  const content: string[] = []
  let inCode = false
  let fence = ""
  let layoutFromHeading: string | null = null
  let sawRightColumn = false
  let sawLeftColumn = false
  let sawColumns = false
  let sawNonEmpty = false

  slide.content.forEach((raw) => {
    const trimmed = raw.trim()
    const fenceMatch = trimmed.match(/^(```+|~~~+)/)
    if (fenceMatch) {
      if (!inCode) {
        inCode = true
        fence = fenceMatch[1]
      } else if (trimmed.startsWith(fence)) {
        inCode = false
        fence = ""
      }
      content.push(raw)
      return
    }

    if (!inCode && /^#{1,3}\s+/i.test(trimmed) && !sawNonEmpty) {
      const token = trimmed.replace(/^#{1,3}\s+/i, "").trim().toLowerCase()
      if (SLIDEV_LAYOUTS.includes(token) && !layoutFromHeading) {
        layoutFromHeading = token
        return
      }
    }

    if (!inCode) {
      const kv = parseKeyValue(trimmed)
      if (kv && SLIDEV_SLIDE_KEY_SET.has(kv.key.toLowerCase())) {
        if (!known[kv.key.toLowerCase()]) {
          pushKnown(kv.key.toLowerCase(), kv.value.trim())
        }
        return
      }
    }

    if (trimmed === "::right::") {
      sawRightColumn = true
    }

    if (trimmed === "::left::") {
      sawLeftColumn = true
    }

    if (trimmed === "::cols::") {
      sawColumns = true
    }

    if (trimmed) {
      sawNonEmpty = true
    }

    content.push(raw)
  })

  if (layoutFromHeading && !known.layout) {
    pushKnown("layout", layoutFromHeading)
  }

  if ((sawRightColumn || sawLeftColumn || sawColumns) && !known.layout) {
    pushKnown("layout", "two-cols")
  }

  if (inCode) {
    content.push(fence || "```")
  }

  const contentText = content.join("\n").trim()
  const frontmatterLinesOut = [
    ...others,
    ...SLIDEV_SLIDE_KEYS.filter((key) => known[key]).map((key) => `${key}: ${known[key]}`),
  ]

  if (!frontmatterLinesOut.length) {
    return contentText
  }

  if (!contentText) {
    return `---\n${frontmatterLinesOut.join("\n")}\n---`
  }

  return `---\n${frontmatterLinesOut.join("\n")}\n---\n${contentText}`.trim()
}

function normalizeSlidevMarkdown(markdown: string) {
  const trimmed = markdown.trim()
  if (!trimmed) return markdown

  const { frontmatterLines, bodyLines } = extractDeckFrontmatter(markdown)
  const deckLines: string[] = []
  const slideKeys: string[] = []

  frontmatterLines.forEach((line) => {
    const kv = parseKeyValue(line)
    if (!kv) {
      if (line.trim()) deckLines.push(line.trim())
      return
    }
    const key = kv.key.toLowerCase()
    if (SLIDEV_SLIDE_KEY_SET.has(key)) {
      slideKeys.push(`${kv.key}: ${kv.value.trim()}`)
    } else {
      deckLines.push(`${kv.key}: ${kv.value.trim()}`)
    }
  })

  const slides = parseSlides(bodyLines)
    .map((slide, index) => normalizeSlideBlock(slide, index === 0 ? slideKeys : []))
    .filter((slide) => slide.trim() !== "")

  const joined = slides.join("\n\n---\n\n").trim()
  if (!deckLines.length) {
    return joined
  }

  if (!joined) {
    return `---\n${deckLines.join("\n")}\n---`
  }

  return `---\n${deckLines.join("\n")}\n---\n${joined}`.trim()
}

function getLayoutFromFrontmatter(lines: string[]) {
  for (const line of lines) {
    const kv = parseKeyValue(line)
    if (!kv) continue
    if (kv.key.toLowerCase() === "layout") {
      return kv.value.trim().toLowerCase()
    }
  }
  return null
}

function validateSlidevMarkdown(markdown: string) {
  const errors: string[] = []
  const trimmed = markdown.trim()
  if (!trimmed) {
    return { ok: false, errors: ["输出为空，无法应用。"] }
  }

  const { frontmatterLines, bodyLines } = extractDeckFrontmatter(markdown)
  const deckHasSlideKeys = frontmatterLines.some((line) => {
    const kv = parseKeyValue(line)
    return kv ? SLIDEV_SLIDE_KEY_SET.has(kv.key.toLowerCase()) : false
  })
  if (deckHasSlideKeys) {
    errors.push("顶层 frontmatter 中包含 slide 级别字段（layout/class/background/transition）。")
  }

  const slides = parseSlides(bodyLines)
  if (!slides.length) {
    errors.push("没有检测到任何 slide 内容。")
  }

  slides.forEach((slide, index) => {
    const layout = getLayoutFromFrontmatter(slide.frontmatter)
    let inCode = false
    let fence = ""
    let sawNonEmpty = false
    let layoutHeadingAtTop = false
    let layoutHeadingToken: string | null = null
    let sawColumns = false
    let sawSlideKeyInBody = false

    slide.content.forEach((raw) => {
      const trimmedLine = raw.trim()
      const fenceMatch = trimmedLine.match(/^(```+|~~~+)/)
      if (fenceMatch) {
        if (!inCode) {
          inCode = true
          fence = fenceMatch[1]
        } else if (trimmedLine.startsWith(fence)) {
          inCode = false
          fence = ""
        }
        return
      }

      if (inCode) return
      if (!trimmedLine) return

      if (!sawNonEmpty) {
        const headingMatch = trimmedLine.match(/^#{1,3}\s+(.+)$/)
        if (headingMatch) {
          const token = headingMatch[1].trim().toLowerCase()
          if (SLIDEV_LAYOUTS.includes(token)) {
            layoutHeadingAtTop = true
            layoutHeadingToken = token
          }
        }
      }

      const kv = parseKeyValue(trimmedLine)
      if (kv && SLIDEV_SLIDE_KEY_SET.has(kv.key.toLowerCase())) {
        sawSlideKeyInBody = true
      }

      if (trimmedLine === "::right::" || trimmedLine === "::left::" || trimmedLine === "::cols::") {
        sawColumns = true
      }

      sawNonEmpty = true
    })

    if (inCode) {
      errors.push(`第 ${index + 1} 页代码块未闭合。`)
    }

    if (layoutHeadingAtTop && !layout) {
      errors.push(`第 ${index + 1} 页用标题“## ${layoutHeadingToken ?? "layout"}”代替 layout，但未写入 frontmatter。`)
    }

    if (sawSlideKeyInBody) {
      errors.push(`第 ${index + 1} 页包含位于正文中的 slide 字段（layout/class/background/transition）。`)
    }

    if (sawColumns && layout !== "two-cols") {
      errors.push(`第 ${index + 1} 页使用了分栏语法，但未设置 layout: two-cols。`)
    }
  })

  return { ok: errors.length === 0, errors }
}

function sanitizeToSingleSlide(markdown: string) {
  const { frontmatterLines, bodyLines } = extractDeckFrontmatter(markdown)
  const deckLines: string[] = []

  frontmatterLines.forEach((line) => {
    const kv = parseKeyValue(line)
    if (!kv) return
    if (SLIDEV_DECK_KEYS.has(kv.key.toLowerCase())) {
      deckLines.push(`${kv.key}: ${kv.value.trim()}`)
    }
  })

  const slides = parseSlides(bodyLines)
  const contentLines: string[] = []
  slides.forEach((slide, index) => {
    if (index > 0) contentLines.push("")
    contentLines.push(...slide.content)
  })

  const sanitized: string[] = []
  let inCode = false
  let fence = ""
  let sawNonEmpty = false

  for (const raw of contentLines) {
    const trimmed = raw.trim()
    const fenceMatch = trimmed.match(/^(```+|~~~+)/)
    if (fenceMatch) {
      if (!inCode) {
        inCode = true
        fence = fenceMatch[1]
      } else if (trimmed.startsWith(fence)) {
        inCode = false
        fence = ""
      }
      sanitized.push(raw)
      continue
    }

    if (inCode) {
      sanitized.push(raw)
      continue
    }

    if (!trimmed) {
      sanitized.push(raw)
      continue
    }

    if (!sawNonEmpty) {
      const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/)
      if (headingMatch) {
        const token = headingMatch[1].trim().toLowerCase()
        if (SLIDEV_LAYOUTS.includes(token)) {
          sanitized.push(`## ${token.toUpperCase()} SLIDE`)
          sawNonEmpty = true
          continue
        }
      }
    }

    const kv = parseKeyValue(trimmed)
    if (kv && SLIDEV_SLIDE_KEY_SET.has(kv.key.toLowerCase())) {
      sanitized.push(`- ${trimmed}`)
      sawNonEmpty = true
      continue
    }

    if (trimmed === "::right::") {
      sanitized.push("**Right column**")
      sawNonEmpty = true
      continue
    }

    if (trimmed === "::left::") {
      sanitized.push("**Left column**")
      sawNonEmpty = true
      continue
    }

    if (trimmed === "::cols::") {
      sanitized.push("**Columns**")
      sawNonEmpty = true
      continue
    }

    if (trimmed === "---") {
      sanitized.push("----")
      sawNonEmpty = true
      continue
    }

    sanitized.push(raw)
    sawNonEmpty = true
  }

  if (inCode) {
    sanitized.push(fence || "```")
  }

  let content = sanitized.join("\n").trim()
  if (!content) {
    content = "# Slide"
  }

  if (!deckLines.length) {
    return content
  }

  return `---\n${deckLines.join("\n")}\n---\n${content}`.trim()
}

function strictSlidevProcessor(markdown: string) {
  const normalized = normalizeSlidevMarkdown(markdown)
  const validation = validateSlidevMarkdown(normalized)
  if (validation.ok) {
    return { text: normalized, fixed: false, errors: [] as string[] }
  }

  const fallback = sanitizeToSingleSlide(normalized)
  const fallbackValidation = validateSlidevMarkdown(fallback)
  if (fallbackValidation.ok) {
    return { text: fallback, fixed: true, errors: validation.errors }
  }

  return { text: normalized, fixed: true, errors: validation.errors.concat(fallbackValidation.errors) }
}

export default function Home() {
  const { data: session, status } = useSession()
  const [input, setInput] = useState(SAMPLE_MARKDOWN)
  const [output, setOutput] = useState("")
  const [theme, setTheme] = useState("seriph")
  const [transition, setTransition] = useState("slide-left")
  const [title, setTitle] = useState("My Presentation")
  const [darkMode, setDarkMode] = useState(false)
  const [stats, setStats] = useState({ totalSlides: 0, hasCode: false, hasImages: false, hasDiagrams: false })

  // AI Features - 初始化消息为空数组，后续根据订阅状态动态设置
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Subscription state - fetched from API
  const [subscription, setSubscription] = useState<{
    hasAiAccess: boolean
    planType: string
    status: string
  } | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)

  // Fetch subscription when session changes
  useEffect(() => {
    const fetchSubscription = async () => {
      if (session?.user) {
        setSubscriptionLoading(true)
        try {
          const res = await fetch("/api/subscription")
          if (res.ok) {
            const data = await res.json()
            const hasAiAccess = data.hasAiAccess || data.status === "TRIALING"
            setSubscription({
              hasAiAccess,
              planType: data.planType,
              status: data.status,
            })

            // 根据订阅状态设置欢迎消息
            if (hasAiAccess) {
              setMessages([{
                id: "welcome",
                role: "assistant",
                content: "Hi! I'm your Slidev assistant. 👋\n\nYou have **Pro access**! I can help you with:\n• Optimizing slide layouts\n• Generating images for your slides\n• Improving content and design\n\nWhat would you like help with?",
                timestamp: new Date(),
                actions: [{
                  label: "Manage Subscription",
                  action: () => {
                    if (typeof window !== "undefined") {
                      window.location.href = "/account"
                    }
                  },
                  variant: "outline",
                }],
              }])
            } else {
              setMessages([{
                id: "welcome",
                role: "assistant",
                content: "Hi! I'm your Slidev assistant. 👋\n\nWith the **Free plan**, you can convert Markdown to Slidev and preview your slides.\n\nUpgrade to **Pro** to unlock AI features:\n• Layout optimization\n• Image generation\n• Chat assistance",
                timestamp: new Date(),
                actions: [{
                  label: "Upgrade to Pro",
                  action: () => {
                    if (typeof window !== "undefined") {
                      window.location.href = "/pricing"
                    }
                  },
                  variant: "default",
                }],
              }])
            }
          }
        } catch (error) {
          console.error("Failed to fetch subscription:", error)
        } finally {
          setSubscriptionLoading(false)
        }
      } else {
        setSubscription(null)
        // 未登录用户
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: "Hi! I'm your Slidev assistant. 👋\n\n**Sign in** to get started:\n• Convert Markdown to Slidev\n• Preview your slides in real-time\n• Download as .md file\n\n**Pro users** also get:\n• AI-powered layout optimization\n• AI image generation\n• Chat assistance",
          timestamp: new Date(),
          actions: [{
            label: "Sign In",
            action: () => {
              if (typeof window !== "undefined") {
                window.location.href = "/login"
              }
            },
            variant: "default",
          }],
        }])
      }
    }

    fetchSubscription()
  }, [session])

  // View state
  const [showPreview, setShowPreview] = useState(true)
  const [activePanel, setActivePanel] = useState<"editor" | "preview">("editor")

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
    const aiAllowed = !!session?.user && (subscription?.hasAiAccess || subscription?.status === "TRIALING")

    // Always show the user's message
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    }

    if (session?.user && !aiAllowed) {
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1]
        const upgradeMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "AI features are available for Pro subscribers.\n\n**Free Plan:**\n• Convert Markdown to Slidev\n• Live preview\n• Download slides\n\n**Pro Plan:**\n• Everything in Free\n• AI-powered layout optimization\n• AI image generation\n• Chat assistance\n\n[Upgrade to Pro](/pricing)",
          timestamp: new Date(),
        }

        if (lastMessage?.role === "assistant" && lastMessage.content.includes("Upgrade to Pro")) {
          return [...prev, newUserMessage]
        }

        return [...prev, newUserMessage, upgradeMessage]
      })
      return
    }

    if (!shouldCallAI(userMessage)) {
      setMessages(prev => [
        ...prev,
        newUserMessage,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "我需要你**明确想要的操作**，比如：\n- 帮我优化这个标题页\n- 把这段内容拆成 5 页\n- 给第 3 页建议布局\n\n你也可以直接贴出要处理的内容。",
          timestamp: new Date(),
        },
      ])
      return
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

      const response = await fetch("/api/kimi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: claudeMessages,
          slidevContent: output,
          originalMarkdown: input,
          model: "moonshot-v1-8k",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "调用 Kimi API 失败")
      }

      const data = await response.json()
      const extracted = extractMarkdownFromResponse(data.response)
      const previousOutput = output
      let applied = false
      let validationErrors: string[] = []
      let usedFallback = false

      if (extracted) {
        const processed = strictSlidevProcessor(extracted)
        setOutput(processed.text)
        applied = true
        usedFallback = processed.fixed
        validationErrors = processed.errors
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        actions: applied
          ? [{
              label: "Undo Apply",
              action: () => setOutput(previousOutput),
              variant: "outline",
            }]
          : undefined,
      }
      setMessages(prev => {
        const next = [...prev, assistantMessage]
        if (validationErrors.length) {
          const hint = usedFallback
            ? "原始输出不合规，已由格式处理器自动修正并应用。"
            : "格式校验失败，未应用到输出。"
          next.push({
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `${hint}\n${validationErrors.map((err) => `- ${err}`).join("\n")}\n\n请补充更明确的需求或让 AI 重新输出**合法 Slidev Markdown**。`,
            timestamp: new Date(),
          })
        }
        return next
      })

    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}.`,
        timestamp: new Date(),
      }])
    } finally {
      setIsProcessing(false)
    }
  }, [session, subscription, messages, output, input])

  // Handle adding image to slide
  const handleAddImage = async (slideIndex: number) => {
    // Check if user has AI access
    const aiAllowed = !!session?.user && (subscription?.hasAiAccess || subscription?.status === "TRIALING")
    if (session?.user && !aiAllowed) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "Image generation is a Pro feature.\n\n[Upgrade to Pro](/pricing) to unlock AI image generation for your slides.",
        timestamp: new Date(),
      }])
      return
    }

    // Ask user what image they want
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "assistant",
      content: `What kind of image would you like to generate for slide ${slideIndex + 1}? Please describe the image you want.`,
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
              {/* User Info */}
              {status === "loading" ? (
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              ) : session?.user ? (
                <div className="flex items-center gap-3">
                  {/* Subscription Badge */}
                  {/* Subscription Badge */}
                  {subscription && (
                    <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      subscription.hasAiAccess
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {subscription.hasAiAccess ? (
                        <Sparkles className="h-3 w-3" />
                      ) : null}
                      {subscription.hasAiAccess ? "Pro" : "Free"}
                    </div>
                  )}

                  {/* User Menu */}
                  <div className="flex items-center gap-2 pl-2 border-l">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      title="Account Settings"
                    >
                      <a href="/account">
                        <User className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Account</span>
                      </a>
                    </Button>
                    {session.user.image && (
                      <img
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        className="h-8 w-8 rounded-full"
                      />
                    )}
                    <span className="hidden sm:inline text-sm font-medium">{session.user.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => signOut()}
                      title="Sign out"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button asChild size="sm">
                  <a href="/login">
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </a>
                </Button>
              )}

              {/* Upgrade button for free users */}
              {session?.user && !subscription?.hasAiAccess && (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  title="Upgrade to Pro"
                >
                  <a href="/pricing">
                    <Crown className="h-5 w-5" />
                  </a>
                </Button>
              )}
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

        {/* Usage Dashboard for Pro Users */}
        {subscription?.hasAiAccess && (
          <div className="mb-6">
            <UsageDashboard userId={session?.user?.id} />
          </div>
        )}

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
