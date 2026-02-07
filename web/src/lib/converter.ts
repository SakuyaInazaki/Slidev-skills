/**
 * Slidev Converter - Core Conversion Logic
 * Converts standard Markdown to Slidev presentation format
 */

export interface ConversionOptions {
  theme?: string
  title?: string
  author?: string
  transition?: string
}

export interface ConversionResult {
  slides: string
  warnings: string[]
  stats: {
    totalSlides: number
    hasCode: boolean
    hasImages: boolean
    hasDiagrams: boolean
  }
}

/**
 * Main conversion function
 */
export function convertToSlidev(markdown: string, options: ConversionOptions = {}): ConversionResult {
  const warnings: string[] = []
  const stats = {
    totalSlides: 0,
    hasCode: false,
    hasImages: false,
    hasDiagrams: false,
  }

  // Normalize line endings
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

  // Extract existing frontmatter if any
  const { frontmatter, content } = extractFrontmatter(normalized)

  // Detect content features
  stats.hasCode = /```[a-z]+/.test(content)
  stats.hasImages = /!\[.*?\]\(.*?\)/.test(content)
  stats.hasDiagrams = /```mermaid/.test(content)

  // Analyze structure and split into sections
  const sections = analyzeStructure(content)

  // Convert each section to a slide
  const slides = sections.map(section => convertSection(section, warnings)).join("\n\n")

  // Build final output with frontmatter
  const finalFrontmatter = buildFrontmatter(frontmatter, options)
  const result = `${finalFrontmatter}\n${slides}`

  stats.totalSlides = sections.length

  return {
    slides: result,
    warnings,
    stats,
  }
}

/**
 * Extract YAML frontmatter from markdown
 */
function extractFrontmatter(markdown: string): { frontmatter: string; content: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/
  const match = markdown.match(frontmatterRegex)

  if (match) {
    return {
      frontmatter: match[1],
      content: markdown.slice(match[0].length),
    }
  }

  return { frontmatter: "", content: markdown }
}

/**
 * Analyze markdown structure and identify slide boundaries
 */
interface Section {
  level: number // heading level (1-6)
  title: string
  content: string
  hasCode: boolean
  hasImage: boolean
}

function analyzeStructure(markdown: string): Section[] {
  const sections: Section[] = []
  const lines = markdown.split("\n")

  let currentSection: Section = {
    level: 1,
    title: "",
    content: "",
    hasCode: false,
    hasImage: false,
  }

  let inCodeBlock = false
  let contentBuffer: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Track code blocks
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock
      contentBuffer.push(line)
      currentSection.hasCode = true
      continue
    }

    // Skip heading detection inside code blocks
    if (inCodeBlock) {
      contentBuffer.push(line)
      continue
    }

    // Detect headings (potential slide boundaries)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const title = headingMatch[2].trim()

      // Save previous section if it has content
      if (currentSection.title || contentBuffer.length > 0) {
        currentSection.content = contentBuffer.join("\n").trim()
        sections.push({ ...currentSection })
      }

      // Start new section
      currentSection = {
        level,
        title,
        content: "",
        hasCode: false,
        hasImage: false,
      }
      contentBuffer = []
    } else {
      contentBuffer.push(line)
      if (line.match(/!\[.*?\]\(.*?\)/)) {
        currentSection.hasImage = true
      }
    }
  }

  // Don't forget the last section
  if (currentSection.title || contentBuffer.length > 0) {
    currentSection.content = contentBuffer.join("\n").trim()
    sections.push(currentSection)
  }

  // If no sections found (no headings), treat entire content as one slide
  if (sections.length === 0 && markdown.trim()) {
    sections.push({
      level: 1,
      title: "",
      content: markdown.trim(),
      hasCode: false,
      hasImage: false,
    })
  }

  return sections
}

/**
 * Convert a section to Slidev slide format
 */
function convertSection(section: Section, warnings: string[]): string {
  let slideContent = ""
  let frontmatter: string[] = []

  // Determine appropriate layout
  const layout = determineLayout(section)
  if (layout && layout !== "default") {
    frontmatter.push(`layout: ${layout}`)
  }

  // Add transition if this looks like a major section
  if (section.level === 1) {
    frontmatter.push(`transition: slide-left`)
  }

  // Build slide
  if (frontmatter.length > 0) {
    slideContent += "---\n"
    slideContent += frontmatter.join("\n")
    slideContent += "\n---\n\n"
  } else {
    slideContent += "---\n---\n\n"
  }

  // Add title (convert heading level)
  if (section.title) {
    // Adjust heading level: # becomes ## (slide title), ## becomes ###, etc.
    const headingLevel = Math.min(section.level + 1, 6)
    slideContent += `${"#".repeat(headingLevel)} ${section.title}\n\n`
  }

  // Process content
  slideContent += processSectionContent(section.content)

  return slideContent
}

/**
 * Determine best layout for a section
 */
function determineLayout(section: Section): string {
  // Image + text content
  if (section.hasImage && section.content.length > 200) {
    return "image-right"
  }

  // Code-heavy sections
  if (section.hasCode && section.content.length > 300) {
    return "two-cols"
  }

  // Short content (maybe a title slide)
  if (section.content.length < 100 && !section.hasCode) {
    return "center"
  }

  return "default"
}

/**
 * Process section content for Slidev compatibility
 */
function processSectionContent(content: string): string {
  let processed = content

  // Convert regular lists to v-clicks for short lists
  processed = processed.replace(
    /^(\s*)(?:-|\*|\d+\.)\s+(.+)$/gm,
    (match, indent, text) => {
      return `${indent}- ${text}`
    }
  )

  // Ensure proper code block syntax with line highlighting support
  processed = processed.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (match, lang = "", code) => {
      return "```" + lang + "\n" + code + "```"
    }
  )

  return processed
}

/**
 * Build final frontmatter
 */
function buildFrontmatter(existing: string, options: ConversionOptions): string {
  const lines: string[] = []

  // Parse existing frontmatter
  const existingConfig = parseYaml(existing)

  // Merge with options
  const config = {
    theme: options.theme || existingConfig.theme || "seriph",
    title: options.title || existingConfig.title || "Presentation",
    author: options.author || existingConfig.author || "",
    transition: options.transition || existingConfig.transition || "slide-left",
    ...existingConfig,
  }

  lines.push("---")
  lines.push(`theme: ${config.theme}`)
  lines.push(`title: "${config.title}"`)
  if (config.author) lines.push(`author: "${config.author}"`)
  lines.push(`transition: ${config.transition}`)
  lines.push(`class: text-center`)
  lines.push("---")

  return lines.join("\n")
}

/**
 * Simple YAML parser for frontmatter
 */
function parseYaml(yaml: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = yaml.split("\n")

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/)
    if (match) {
      const [, key, value] = match
      // Remove quotes if present
      result[key] = value.replace(/^["']|["']$/g, "")
    }
  }

  return result
}

/**
 * Export slides as downloadable file
 */
export function downloadSlides(content: string, filename = "slides.md") {
  const blob = new Blob([content], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Get available themes
 */
export const THEMES = [
  { value: "seriph", label: "Seriph", description: "Serif font theme" },
  { value: "default", label: "Default", description: "Minimalist theme" },
  { value: "apple-basic", label: "Apple Basic", description: "Apple-style" },
  { value: "shibainu", label: "Shibainu", description: "Cute dog theme" },
  { value: "unicorn", label: "Unicorn", description: "Colorful theme" },
]

/**
 * Get available transitions
 */
export const TRANSITIONS = [
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-down", label: "Slide Down" },
  { value: "fade", label: "Fade" },
  { value: "view-transition", label: "View Transition" },
]
