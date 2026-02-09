import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query")?.trim() || ""

  if (!query) {
    return NextResponse.json({ users: [] })
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      subscription: true,
    },
    take: 20,
    orderBy: {
      createdAt: "desc",
    },
  })

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      subscription: user.subscription
        ? {
            planType: user.subscription.planType,
            status: user.subscription.status,
            hasAiAccess: user.subscription.hasAiAccess,
            monthlyTokens: user.subscription.monthlyTokens,
            tokensUsed: user.subscription.tokensUsed,
            imagesAllowed: user.subscription.imagesAllowed,
            imagesGenerated: user.subscription.imagesGenerated,
            trialEndsAt: user.subscription.trialEndsAt,
            currentPeriodStart: user.subscription.currentPeriodStart,
            currentPeriodEnd: user.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
          }
        : null,
    })),
  })
}
