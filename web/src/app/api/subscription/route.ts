import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const userId = session.user.id

  try {
    // Get or create subscription
    let subscription = await prisma.subscription.findUnique({
      where: { userId },
    })

    // If user doesn't have a subscription record, create one with free plan
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          planType: "PRO",
          status: "TRIALING",
          hasAiAccess: true,
          monthlyTokens: 10_000_000,
          imagesAllowed: 1000,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 day trial
          currentPeriodStart: new Date(),
        },
      })
    }

    // Ensure trial users have AI access enabled
    if (subscription.status === "TRIALING" && !subscription.hasAiAccess) {
      subscription = await prisma.subscription.update({
        where: { userId },
        data: {
          planType: "PRO",
          hasAiAccess: true,
          monthlyTokens: subscription.monthlyTokens || 10_000_000,
          imagesAllowed: subscription.imagesAllowed || 1000,
        },
      })
    }

    // Check if trial has expired
    if (subscription.status === "TRIALING" && subscription.trialEndsAt) {
      const now = new Date()
      if (now > subscription.trialEndsAt) {
        // Trial expired, move to free plan
        subscription = await prisma.subscription.update({
          where: { userId },
          data: {
            status: "ACTIVE",
            planType: "FREE",
            hasAiAccess: false,
            monthlyTokens: 0,
            imagesAllowed: 0,
          },
        })
      }
    }

    return NextResponse.json({
      planType: subscription.planType,
      status: subscription.status,
      hasAiAccess: subscription.hasAiAccess,
      monthlyTokens: subscription.monthlyTokens,
      tokensUsed: subscription.tokensUsed,
      imagesAllowed: subscription.imagesAllowed,
      imagesGenerated: subscription.imagesGenerated,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    })
  } catch (error) {
    console.error("Error fetching subscription:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    )
  }
}

// Cancel subscription (domestic payment - manual update)
export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const userId = session.user.id

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    // For domestic payment, we just mark cancelAtPeriodEnd
    // User won't be charged again when period ends
    const updated = await prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    })

    return NextResponse.json({
      message: "订阅将在当前计费周期结束后取消",
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      currentPeriodEnd: updated.currentPeriodEnd,
    })
  } catch (error) {
    console.error("Error canceling subscription:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}
