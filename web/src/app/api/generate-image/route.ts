import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkUsageLimit, recordUsage } from "@/lib/rate-limit"

export const runtime = "nodejs"

interface ImageGenerationRequest {
  provider?: "zhipu" | "replicate" | "siliconflow"
  apiKey?: string
  prompt: string
  model?: string
  size?: "1024x1024" | "1024x768" | "768x1024"
}

// Zhipu AI CogView (cheapest Chinese option)
async function generateWithZhipu(prompt: string, apiKey: string, size: string = "1024x1024") {
  const response = await fetch("https://open.bigmodel.cn/api/paas/v4/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "cogview-3-plus", // or "cogview-3"
      prompt,
      size,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Zhipu API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.data?.[0]?.url || null
}

// SiliconFlow (aggregator, supports Flux and other models)
async function generateWithSiliconFlow(prompt: string, apiKey: string, model: string = "black-forest-labs/flux-schnell") {
  const response = await fetch("https://api.siliconflow.cn/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      image_size: "1024x1024",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SiliconFlow API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.images?.[0]?.url || data.data?.[0]?.url || null
}

// Replicate (Flux - original)
async function generateWithReplicate(prompt: string, apiKey: string) {
  const response = await fetch(`https://api.replicate.com/v1/predictions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "black-forest-labs/flux-1.1-pro",
      input: {
        prompt,
        aspect_ratio: "16:9",
        output_format: "png",
        safety_checker: true,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Replicate API error: ${response.status} - ${error}`)
  }

  const prediction = await response.json()

  // Poll for result
  let result = prediction
  let attempts = 0
  const maxAttempts = 60

  while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    const pollResponse = await fetch(prediction.urls.get, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    })
    result = await pollResponse.json()
    attempts++
  }

  if (result.status === "failed") {
    throw new Error(`Image generation failed: ${result.error || "Unknown error"}`)
  }

  if (result.status !== "succeeded") {
    throw new Error("Image generation timed out")
  }

  return result.output[0]
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "需要登录。请先登录。" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const usageCheck = await checkUsageLimit(userId, "image")
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason },
        { status: 429 }
      )
    }

    const body: ImageGenerationRequest = await req.json()
    const { provider = "zhipu", apiKey: userApiKey, prompt, size = "1024x1024" } = body

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    let imageUrl: string | null = null

    // Try different providers based on configuration
    if (provider === "zhipu") {
      const apiKey = userApiKey || process.env.ZHIPU_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: "Zhipu API key not configured" },
          { status: 401 }
        )
      }
      imageUrl = await generateWithZhipu(prompt, apiKey, size)
    } else if (provider === "siliconflow") {
      const apiKey = userApiKey || process.env.SILICONFLOW_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: "SiliconFlow API key not configured" },
          { status: 401 }
        )
      }
      imageUrl = await generateWithSiliconFlow(prompt, apiKey)
    } else {
      // Replicate (original)
      const apiKey = userApiKey || process.env.REPLICATE_API_TOKEN
      if (!apiKey) {
        return NextResponse.json(
          { error: "Replicate API key not configured" },
          { status: 401 }
        )
      }
      imageUrl = await generateWithReplicate(prompt, apiKey)
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      )
    }

    // Record usage
    await recordUsage(userId, "image")

    return NextResponse.json({
      imageUrl,
      prompt,
    })

  } catch (error) {
    console.error("Image generation error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate image"
      },
      { status: 500 }
    )
  }
}
