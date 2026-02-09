import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkUsageLimit, recordUsage } from "@/lib/rate-limit"

export const runtime = "nodejs"

interface KimiMessage {
  role: "user" | "assistant" | "system"
  content: string
}

interface KimiRequestBody {
  messages: KimiMessage[]
  apiKey?: string // Optional, will use server key if not provided
  slidevContent?: string
  originalMarkdown?: string
  model?: "moonshot-v1-8k" | "moonshot-v1-32k" | "moonshot-v1-128k"
}

const SLIDEV_LAYOUTS = [
  "cover", "center", "default", "intro", "section",
  "two-cols", "image-right", "image-left", "image",
  "statement", "quote", "iframe"
]

const SYSTEM_PROMPT = `你是一位 Slidev 演示文稿设计专家。你的职责是帮助用户创建美观、有效的幻灯片演示。

## 你的能力

1. **布局优化**: 分析幻灯片内容并推荐最佳的 Slidev 布局
2. **视觉增强**: 建议颜色、动画（v-click）和视觉元素
3. **内容精炼**: 改进措辞、结构和清晰度
4. **图片建议**: 推荐在哪里添加图片会有帮助

## Slidev 布局参考

- **cover**: 带有居中内容的标题幻灯片
- **center**: 居中内容，适合引用或关键点
- **default**: 标准的从上到下流程
- **two-cols**: 左右分割内容，非常适合文字 + 代码
- **image-right**: 左边文字，右边图片
- **image-left**: 左边图片，右边文字
- **quote**: 大号引用格式
- **statement**: 大号粗体声明
- **section**: 章节分隔幻灯片

## Slidev 语法规则

- Frontmatter 位于 \`---\` 标记之间
- 布局语法: \`layout: two-cols\`
- 过渡效果: \`transition: slide-left\`
- 点击动画: \`<div v-click>\` 或列表的 \`<v-clicks>\`
- 两栏布局: 使用 \`::right::\` 标记右栏内容
- 始终保持语法有效

## 回复格式

当建议更改时，请提供：
1. 更改的清晰说明
2. 要使用的确切 slidev markdown 代码
3. 为什么这样可以改进演示

请简洁但全面。专注于有影响力的改进。`

async function callKimiAPI(messages: KimiMessage[], apiKey: string, model: string = "moonshot-v1-8k") {
  const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Kimi API error: ${response.status}`
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.error?.message || errorMessage
    } catch {
      errorMessage += ` - ${errorText}`
    }
    throw new Error(errorMessage)
  }

  const data = await response.json()
  return {
    text: data.choices[0].message.content || "",
    usage: {
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
    },
  }
}

export async function POST(req: NextRequest) {
  try {
    // 检查认证
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "需要登录。请先登录。" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 检查聊天功能的使用限制
    const usageCheck = await checkUsageLimit(userId, "chat")
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason },
        { status: 429 }
      )
    }

    const body: KimiRequestBody = await req.json()
    const {
      messages,
      apiKey: userApiKey,
      slidevContent,
      originalMarkdown,
      model = "moonshot-v1-8k"
    } = body

    // 如果用户没有提供 API key，使用服务器端的
    const apiKey = userApiKey || process.env.MOONSHOT_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "需要 API key。请提供您自己的 key 或联系支持。" },
        { status: 401 }
      )
    }

    // 如果有可用的上下文，增强最后一条用户消息
    const enhancedMessages = [...messages]
    const lastUserMsg = enhancedMessages.findLast(m => m.role === "user")

    if (lastUserMsg && (slidevContent || originalMarkdown)) {
      let contextPrompt = lastUserMsg.content

      if (slidevContent) {
        contextPrompt += `\n\n## 当前 Slidev 内容:\n\`\`\`markdown\n${slidevContent}\n\`\`\``
      }

      if (originalMarkdown) {
        contextPrompt += `\n\n## 原始 Markdown:\n\`\`\`markdown\n${originalMarkdown}\n\`\`\``
      }

      lastUserMsg.content = contextPrompt
    }

    const result = await callKimiAPI(enhancedMessages, apiKey, model)

    // 记录使用量（使用的总 token 数）
    const totalTokens = result.usage.total_tokens
    await recordUsage(userId, "chat", totalTokens)

    return NextResponse.json({
      response: result.text,
      usage: {
        inputTokens: result.usage.prompt_tokens,
        outputTokens: result.usage.completion_tokens,
        totalTokens,
      }
    })

  } catch (error) {
    console.error("Kimi API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "调用 Kimi API 失败"
      },
      { status: 500 }
    )
  }
}
