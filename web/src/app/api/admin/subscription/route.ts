import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

type SubscriptionInput = {
  userId: string
  planType?: "FREE" | "PRO"
  status?: "ACTIVE" | "CANCELED" | "TRIALING"
  hasAiAccess?: boolean
  monthlyTokens?: number
  imagesAllowed?: number
  tokensUsed?: number
  imagesGenerated?: number
  resetUsage?: boolean
  setPeriodMonths?: number
}

function isNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body: SubscriptionInput = await req.json()

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const data: Record<string, any> = {}

  if (body.planType === "FREE" || body.planType === "PRO") {
    data.planType = body.planType
  }

  if (body.status === "ACTIVE" || body.status === "CANCELED" || body.status === "TRIALING") {
    data.status = body.status
  }

  if (typeof body.hasAiAccess === "boolean") {
    data.hasAiAccess = body.hasAiAccess
  }

  if (isNumber(body.monthlyTokens)) {
    data.monthlyTokens = Math.max(0, Math.floor(body.monthlyTokens ?? 0))
  }

  if (isNumber(body.imagesAllowed)) {
    data.imagesAllowed = Math.max(0, Math.floor(body.imagesAllowed ?? 0))
  }

  if (isNumber(body.tokensUsed)) {
    data.tokensUsed = Math.max(0, Math.floor(body.tokensUsed ?? 0))
  }

  if (isNumber(body.imagesGenerated)) {
    data.imagesGenerated = Math.max(0, Math.floor(body.imagesGenerated ?? 0))
  }

  if (body.resetUsage) {
    data.tokensUsed = 0
    data.imagesGenerated = 0
  }

  if (isNumber(body.setPeriodMonths) && (body.setPeriodMonths ?? 0) > 0) {
    const now = new Date()
    const periodEnd = new Date(Date.now() + (body.setPeriodMonths ?? 0) * 30 * 24 * 60 * 60 * 1000)
    data.currentPeriodStart = now
    data.currentPeriodEnd = periodEnd
  }

  let subscription = await prisma.subscription.findUnique({
    where: { userId: body.userId },
  })

  if (subscription) {
    subscription = await prisma.subscription.update({
      where: { userId: body.userId },
      data,
    })
  } else {
    subscription = await prisma.subscription.create({
      data: {
        userId: body.userId,
        planType: data.planType || "FREE",
        status: data.status || "ACTIVE",
        hasAiAccess: typeof data.hasAiAccess === "boolean" ? data.hasAiAccess : false,
        monthlyTokens: data.monthlyTokens || 0,
        imagesAllowed: data.imagesAllowed || 0,
        tokensUsed: data.tokensUsed || 0,
        imagesGenerated: data.imagesGenerated || 0,
        currentPeriodStart: data.currentPeriodStart || new Date(),
        currentPeriodEnd: data.currentPeriodEnd || null,
        trialEndsAt: data.trialEndsAt || null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
      },
    })
  }

  return NextResponse.json({ subscription })
}
