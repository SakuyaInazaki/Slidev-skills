import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

const BEIJING_TZ = "Asia/Shanghai"

function getBeijingDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BEIJING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const [year, month, day] = formatter.format(date).split("-")
  return { year, month, day }
}

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
  const { year, month, day } = getBeijingDateParts(now)

  // Only run on Beijing's first day of the month
  if (day !== "01") {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Not the first day in Beijing timezone",
      beijingDate: `${year}-${month}-${day}`,
    })
  }

  const periodStart = new Date(`${year}-${month}-01T00:00:00+08:00`)
  const periodEnd = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const result = await prisma.subscription.updateMany({
    where: {
      OR: [{ planType: "PRO" }, { hasAiAccess: true }],
    },
    data: {
      tokensUsed: 0,
      imagesGenerated: 0,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  })

  return NextResponse.json({
    ok: true,
    updated: result.count,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    timezone: BEIJING_TZ,
  })
}
