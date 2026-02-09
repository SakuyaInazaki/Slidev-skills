import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkUsageLimit, recordUsage } from "@/lib/rate-limit"

export const runtime = "nodejs"

interface ClaudeMessage {
  role: "user" | "assistant"
  content: string
}

interface ClaudeRequestBody {
  messages: ClaudeMessage[]
  apiKey?: string // Optional, will use server key if not provided
  slidevContent?: string
  originalMarkdown?: string
}

const SLIDEV_LAYOUTS = [
  "cover", "center", "default", "intro", "section",
  "two-cols", "image-right", "image-left", "image",
  "statement", "quote", "iframe"
]

const SYSTEM_PROMPT = `You are a Slidev presentation design expert. Your role is to help users create beautiful, effective slide presentations.

## Your Capabilities

1. **Layout Optimization**: Analyze slide content and recommend the best Slidev layout
2. **Visual Enhancement**: Suggest colors, animations (v-click), and visual elements
3. **Content Refinement**: Improve wording, structure, and clarity
4. **Image Suggestions**: Recommend where images would help

## Slidev Layouts Reference

- **cover**: Title slides with centered content
- **center**: Centered content, good for quotes or key points
- **default**: Standard top-to-bottom flow
- **two-cols**: Split content left/right, great for text + code
- **image-right**: Text on left, image on right
- **image-left**: Image on left, text on right
- **quote**: Large quote formatting
- **statement**: Big bold statement
- **section**: Section divider slides

## Slidev Syntax Rules

- Frontmatter goes between \`---\` markers
- Layout syntax: \`layout: two-cols\`
- Transitions: \`transition: slide-left\`
- Click animations: \`<div v-click>\` or \`<v-clicks>\` for lists
- Two columns: Use \`::right::\` to mark right column content
- Keep syntax valid at all times

## Response Format

When suggesting changes, provide:
1. Clear explanation of the change
2. The exact slidev markdown code to use
3. Why this improves the presentation

Be concise but thorough. Focus on impactful improvements.`

async function callClaudeAPI(messages: ClaudeMessage[], apiKey: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    text: data.content[0].text,
    usage: data.usage || { input_tokens: 0, output_tokens: 0 },
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Check usage limit for chat feature
    const usageCheck = await checkUsageLimit(userId, "chat")
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason },
        { status: 429 }
      )
    }

    const body: ClaudeRequestBody = await req.json()
    const { messages, apiKey: userApiKey, slidevContent, originalMarkdown } = body

    // Use server-side API key if user didn't provide one
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required. Please provide your own key or contact support." },
        { status: 401 }
      )
    }

    // Enhance the last user message with context if available
    const enhancedMessages = [...messages]
    const lastUserMsg = enhancedMessages.findLast(m => m.role === "user")

    if (lastUserMsg && (slidevContent || originalMarkdown)) {
      let contextPrompt = lastUserMsg.content

      if (slidevContent) {
        contextPrompt += `\n\n## Current Slidev Content:\n\`\`\`markdown\n${slidevContent}\n\`\`\``
      }

      if (originalMarkdown) {
        contextPrompt += `\n\n## Original Markdown:\n\`\`\`markdown\n${originalMarkdown}\n\`\`\``
      }

      lastUserMsg.content = contextPrompt
    }

    const result = await callClaudeAPI(enhancedMessages, apiKey)

    // Record usage (total tokens used)
    const totalTokens = result.usage.input_tokens + result.usage.output_tokens
    await recordUsage(userId, "chat", totalTokens)

    return NextResponse.json({
      response: result.text,
      usage: {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
        totalTokens,
      }
    })

  } catch (error) {
    console.error("Claude API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to call Claude API"
      },
      { status: 500 }
    )
  }
}
