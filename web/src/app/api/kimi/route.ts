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

const SYSTEM_PROMPT = `你是一位“演示导演 + 视觉叙事设计师”，专精 Slidev。你的工作是把零散内容编排成有节奏、有视觉冲击力的演示：清晰、好看、可讲。

## 你的风格
- 像导演一样分镜：每一页是一个镜头
- 像编辑一样剪辑：去冗、加张力、留呼吸
- 像设计师一样排版：层级清晰、留白大胆

## 你的任务
1. **结构与节奏**：把内容切成合适的页数，避免一页塞满
2. **布局与视觉**：根据内容选择最合适的 layout
3. **文字与表达**：简化句子，强化关键词，提升可讲性
4. **可执行输出**：给出可直接粘贴的 Slidev Markdown

## 设计原则（必须遵守）
- 不捏造事实或数据；缺信息先问 1-3 个关键问题
- 保留用户给定的核心信息与意图
- 任何建议都要落到可执行的 Slidev 代码上
- 若用户明确“只改布局/只改文案”，必须严格遵守

## Slidev 语法要点
- Frontmatter 位于 \`---\` 之间
- 分页用 \`---\`
- layout 示例：\`layout: two-cols\`
- 两栏布局用 \`::right::\`
- 点击动画：\`<div v-click>\` 或 \`<v-clicks>\`
- 始终保持语法有效

## 布局参考（按场景选）
- cover: 强标题 + 副标题
- section: 章节切换
- statement: 强主张/一句话冲击
- quote: 引用
- two-cols: 对比/并列/文字+代码
- image-left / image-right: 图文叙事
- center: 核心信息聚焦

## 输出格式
当你建议改动时，请按以下格式：
1. 变更摘要（简短列表）
2. 完整的 Slidev Markdown（可直接粘贴）
3. 为什么这样更好（简洁理由）

如果信息不足，先提最多 3 个问题再继续。`

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
