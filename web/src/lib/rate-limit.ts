import { prisma } from "@/lib/prisma"

const FORCE_PRO = process.env.FORCE_PRO === "true"
const DEFAULT_PRO_TOKENS = Number(process.env.PRO_MONTHLY_TOKENS || "10000000")
const DEFAULT_PRO_IMAGES = Number(process.env.PRO_MONTHLY_IMAGES || "1000")

/**
 * Check if user can use AI feature based on their subscription plan
 * Returns { allowed: boolean, reason?: string }
 */
export async function checkUsageLimit(userId: string, feature: "chat" | "image") {
  if (FORCE_PRO) {
    return { allowed: true }
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  if (!subscription) {
    return { allowed: false, reason: "No subscription found" }
  }

  // Free users: no AI access
  if (subscription.planType === "FREE" || !subscription.hasAiAccess) {
    return { allowed: false, reason: "AI features require Pro subscription" }
  }

  // Pro users: check their monthly quota
  if (feature === "chat") {
    // Check token usage
    const monthlyTokens = subscription.monthlyTokens || DEFAULT_PRO_TOKENS
    if (subscription.tokensUsed >= monthlyTokens) {
      return {
        allowed: false,
        reason: "Monthly token limit reached. Please upgrade or wait for next billing cycle.",
      }
    }
  } else if (feature === "image") {
    // Check image generation count
    const imagesAllowed = subscription.imagesAllowed || DEFAULT_PRO_IMAGES
    if (subscription.imagesGenerated >= imagesAllowed) {
      return {
        allowed: false,
        reason: "Monthly image generation limit reached. Please upgrade or wait for next billing cycle.",
      }
    }
  }

  return { allowed: true }
}

/**
 * Record usage after successful AI call
 */
export async function recordUsage(
  userId: string,
  feature: "chat" | "image",
  tokensUsed?: number
) {
  const updateData: any = {}

  if (feature === "chat" && tokensUsed) {
    updateData.tokensUsed = {
      increment: tokensUsed,
    }
  } else if (feature === "image") {
    updateData.imagesGenerated = {
      increment: 1,
    }
  }

  await prisma.subscription.update({
    where: { userId },
    data: updateData,
  })
}

/**
 * Get user's current usage stats
 */
export async function getUserUsage(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      planType: true,
      hasAiAccess: true,
      monthlyTokens: true,
      tokensUsed: true,
      imagesAllowed: true,
      imagesGenerated: true,
      currentPeriodEnd: true,
    },
  })

  if (!subscription) {
    return null
  }

  return {
    planType: subscription.planType,
    hasAiAccess: subscription.hasAiAccess,
    tokens: {
      limit: subscription.monthlyTokens,
      used: subscription.tokensUsed,
      remaining: subscription.monthlyTokens - subscription.tokensUsed,
      percentage: (subscription.tokensUsed / subscription.monthlyTokens) * 100,
    },
    images: {
      limit: subscription.imagesAllowed,
      used: subscription.imagesGenerated,
      remaining: subscription.imagesAllowed - subscription.imagesGenerated,
      percentage: (subscription.imagesGenerated / subscription.imagesAllowed) * 100,
    },
    currentPeriodEnd: subscription.currentPeriodEnd,
  }
}

/**
 * Reset usage counters (called by webhook on renewal)
 */
export async function resetUsage(userId: string) {
  await prisma.subscription.update({
    where: { userId },
    data: {
      tokensUsed: 0,
      imagesGenerated: 0,
    },
  })
}

/**
 * Simple in-memory rate limiter for API endpoints
 * Prevents abuse of free endpoints
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    // Create new window
    const resetTime = now + windowMs
    rateLimitMap.set(identifier, { count: 1, resetTime })
    return { allowed: true, remaining: limit - 1, resetTime }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count++
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime }
}

/**
 * Clean up expired rate limit entries (run periodically)
 */
export function cleanupRateLimits() {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}

// Run cleanup every hour
if (typeof window === "undefined") {
  setInterval(cleanupRateLimits, 60 * 60 * 1000)
}
