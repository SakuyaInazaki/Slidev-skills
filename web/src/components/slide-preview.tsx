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

    // Split by --- which separates slides
    const rawSlides = content.split(/^\n---\n$/m)

    return rawSlides.map((raw) => {
      // Check for frontmatter
      const frontmatterMatch = raw.match(/^---\n([\s\S]+?)\n---/)

      let frontmatter: Record<string, any> = {}
      let slideContent = raw

      if (frontmatterMatch) {
        try {
          // Parse YAML frontmatter (basic parsing)
          frontmatterMatch[1].split("\n").forEach((line) => {
            const [key, ...valueParts] = line.split(":")
            if (key && valueParts.length > 0) {
              const value = valueParts.join(":").trim()
              frontmatter[key.trim()] = value
            }
          })
        } catch (e) {
          // Ignore parse errors
        }
        slideContent = raw.replace(/^---\n[\s\S]+?\n---\n?/, "")
      }

      return {
        frontmatter,
        content: slideContent.trim(),
        raw,
      }
    }).filter(slide => slide.content || Object.keys(slide.frontmatter).length > 0)
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
