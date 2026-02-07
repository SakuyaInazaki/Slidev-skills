"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
} from "lucide-react"
import { convertToSlidev, downloadSlides, THEMES, TRANSITIONS, type ConversionOptions } from "@/lib/converter"

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

## Math Formula

The famous equation:

$$
E = mc^2
$$

## Diagram

\`\`\`mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action 1]
  B -->|No| D[Action 2]
  C --> E[End]
  D --> E
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
    // Could add a toast notification here
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
            </div>
          </CardContent>
        </Card>

        {/* Editor & Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card className="h-[calc(100vh-280px)] flex flex-col">
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
          <Card className="h-[calc(100vh-280px)] flex flex-col">
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
                onChange={() => {}}
                language="markdown"
                readOnly
                className="h-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview & Export
            </CardTitle>
            <CardDescription>
              Copy the output above and paste it into a Slidev project to preview, or use the official{" "}
              <a
                href="https://sli.dev/play"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 inline-flex"
              >
                Slidev Playground
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button asChild>
                <a
                  href="https://sli.dev/play"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open Playground
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
            </div>
          </CardContent>
        </Card>
      </main>

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
