"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Image as ImageIcon, Upload } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface SlidePreviewProps {
  content: string
  theme?: string
  onAddImage?: (slideIndex: number) => void
  onUploadImage?: (slideIndex: number, file: File) => void
}

interface ParsedSlide {
  frontmatter: Record<string, any>
  content: string
  raw: string
}

export function SlidePreview({ content, theme = "seriph", onAddImage, onUploadImage }: SlidePreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = useMemo(() => {
    if (!content) return []

    // More robust parsing for Slidev format
    // Slidev format:
    // --- (start)
    // frontmatter (optional)
    // ---
    // content
    // ---
    // ... (repeats)

    const parsedSlides: ParsedSlide[] = []
    const parts = content.split(/^---$/m)

    // parts[0] is usually empty or has content before first ---
    // parts[1] is global frontmatter, parts[2] is first slide content, etc.
    // The pattern is: [empty], [global fm], [slide 1 fm?], [slide 1 content], [slide 2 fm?], [slide 2 content], ...

    let i = 0
    if (parts.length > 0 && parts[0].trim() === "") {
      i = 1 // Skip initial empty part
    }

    // Skip global frontmatter
    if (i < parts.length && parts[i].includes("theme:")) {
      i += 2 // Skip frontmatter and its closing ---
    }

    // Now parse slides
    while (i < parts.length) {
      const part = parts[i].trim()

      if (!part) {
        i++
        continue
      }

      let slide: ParsedSlide = {
        frontmatter: {},
        content: "",
        raw: "",
      }

      // Check if this part looks like frontmatter (contains key: value pairs)
      const isFrontmatter = /^[\w-]+:\s*\S+/m.test(part)

      if (isFrontmatter) {
        // Parse frontmatter
        part.split("\n").forEach((line) => {
          const colonIndex = line.indexOf(":")
          if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim()
            const value = line.slice(colonIndex + 1).trim()
            slide.frontmatter[key] = value
          }
        })
        i++

        // Next part is the content
        if (i < parts.length) {
          slide.content = parts[i].trim()
          slide.raw = parts[i]
        }
      } else {
        // This is just content, no frontmatter
        slide.content = part
        slide.raw = part
      }

      // Only add if has content or meaningful frontmatter
      if (slide.content || Object.keys(slide.frontmatter).length > 0) {
        parsedSlides.push(slide)
      }

      i++
    }

    // If parsing failed completely, try a simpler fallback
    if (parsedSlides.length === 0 && content.trim()) {
      // Fallback: split by ---\n---\n pattern
      const fallbackSlides = content.split(/---\n---\n/)
      fallbackSlides.forEach((slideContent, idx) => {
        if (idx === 0 && slideContent.includes("theme:")) return // Skip global frontmatter
        if (slideContent.trim()) {
          parsedSlides.push({
            frontmatter: {},
            content: slideContent.replace(/^---\n[\s\S]*?\n---\n?/, "").trim(),
            raw: slideContent,
          })
        }
      })
    }

    return parsedSlides
  }, [content])

  const currentSlideData = slides[currentSlide]

  const getLayoutClass = () => {
    const layout = currentSlideData?.frontmatter?.layout
    switch (layout) {
      case "cover":
        return "slide-preview-cover"
      case "center":
        return "slide-preview-center"
      case "two-cols":
        return "slide-preview-two-cols"
      case "image-right":
        return "slide-preview-image-right"
      case "image-left":
        return "slide-preview-image-left"
      case "quote":
        return "slide-preview-quote"
      default:
        return "slide-preview-default"
    }
  }

  const renderSlideContent = () => {
    if (!currentSlideData) return null

    const { content, frontmatter } = currentSlideData
    const layout = frontmatter.layout

    // For two-cols layout, we need to handle ::right:: and ::left:: markers
    if (layout === "two-cols") {
      const parts = content.split(/::right::|::left::/i)
      const leftContent = parts[0] || ""
      const rightContent = parts[1] || ""

      return (
        <div className="flex gap-8 h-full">
          <div className="flex-1 overflow-auto prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {leftContent}
            </ReactMarkdown>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 overflow-auto prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {rightContent}
            </ReactMarkdown>
          </div>
        </div>
      )
    }

    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No slides to preview</p>
          <p className="text-sm mt-2">Enter some Markdown to see the preview</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            Slide {currentSlide + 1} / {slides.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
            disabled={currentSlide === slides.length - 1}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1"
            onClick={() => onAddImage?.(currentSlide)}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Add Image
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1"
            onClick={() => {
              const input = document.createElement("input")
              input.type = "file"
              input.accept = "image/*"
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) onUploadImage?.(currentSlide, file)
              }
              input.click()
            }}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
        </div>
      </div>

      {/* Slide preview */}
      <div className="flex-1 overflow-auto p-6 bg-background">
        <div
          className={`slide-preview ${getLayoutClass()} aspect-video bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 border`}
          style={{
            fontFamily: theme === "seriph" ? "Georgia, serif" : "system-ui, sans-serif",
          }}
        >
          {currentSlideData?.frontmatter?.layout === "cover" ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              {renderSlideContent()}
            </div>
          ) : currentSlideData?.frontmatter?.layout === "center" ? (
            <div className="h-full flex items-center justify-center">
              {renderSlideContent()}
            </div>
          ) : currentSlideData?.frontmatter?.layout === "quote" ? (
            <div className="h-full flex items-center justify-center">
              <blockquote className="text-2xl italic border-l-4 border-primary pl-6">
                {renderSlideContent()}
              </blockquote>
            </div>
          ) : (
            <div className="h-full">
              {renderSlideContent()}
            </div>
          )}
        </div>
      </div>

      {/* Slide thumbnails */}
      <div className="p-3 border-t bg-muted/30">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`flex-shrink-0 w-16 h-10 rounded border-2 text-xs font-medium transition-colors ${
                idx === currentSlide
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}
