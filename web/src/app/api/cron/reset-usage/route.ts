import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const headerToken = req.headers.get("authorization")?.replace("Bearer ", "")
  const { searchParams } = new URL(req.url)
  const queryToken = searchParams.get("secret")
  const isVercelCron = req.headers.get("x-vercel-cron") === "1"

  if (secret && !isVercelCron && headerToken !== secret && queryToken !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const result = await prisma.subscription.updateMany({
    where: {
      OR: [{ planType: "PRO" }, { hasAiAccess: true }],
    },
    data: {
      tokensUsed: 0,
      imagesGenerated: 0,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  })

  return NextResponse.json({
    ok: true,
    updated: result.count,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
  })
}
