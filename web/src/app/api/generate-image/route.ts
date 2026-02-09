import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkUsageLimit, recordUsage } from "@/lib/rate-limit"

export const runtime = "nodejs" // Changed from edge to support database operations

interface ImageGenerationRequest {
  apiKey?: string // Optional, will use server key if not provided
  prompt: string
  model?: string
  width?: number
  height?: number
}

const DEFAULT_MODEL = "black-forest-labs/flux-1.1-pro"

async function generateImage(prompt: string, apiKey: string, model: string = DEFAULT_MODEL) {
  const response = await fetch(`https://api.replicate.com/v1/predictions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "black-forest-labs/flux-1.1-pro", // Flux 1.1 Pro
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
  const maxAttempts = 60 // 60 seconds max wait

  while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const pollResponse = await fetch(prediction.urls.get, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
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

  return result.output[0] // Returns the image URL
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

    // Check usage limit for image generation
    const usageCheck = await checkUsageLimit(userId, "image")
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason },
        { status: 429 }
      )
    }

    const body: ImageGenerationRequest = await req.json()
    const { apiKey: userApiKey, prompt, model } = body

    // Use server-side API key if user didn't provide one
    const apiKey = userApiKey || process.env.REPLICATE_API_TOKEN

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required. Please provide your own key or contact support." },
        { status: 401 }
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    // Generate the image
    const imageUrl = await generateImage(prompt, apiKey, model)

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
