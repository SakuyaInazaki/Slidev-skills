import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// 手动激活 Pro（用户提交付款凭证）
export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json(
      { error: "需要登录" },
      { status: 401 }
    )
  }

  const { billingPeriod } = await req.json()
  const userId = session.user.id

  // 计算配额
  let months = 1
  if (billingPeriod === "quarterly") months = 3
  if (billingPeriod === "yearly") months = 12

  const tokensPerMonth = 10_000_000
  const imagesPerMonth = 1000
  const periodEnd = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)

  // 更新订阅（等待管理员审核）
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  if (subscription) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        planType: "PRO",
        status: "TRIALING", // 等待审核
        hasAiAccess: false, // 审核通过后开启
        monthlyTokens: tokensPerMonth,
        imagesAllowed: imagesPerMonth,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    })
  } else {
    await prisma.subscription.create({
      data: {
        userId,
        planType: "PRO",
        status: "TRIALING",
        hasAiAccess: false,
        monthlyTokens: tokensPerMonth,
        imagesAllowed: imagesPerMonth,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    })
  }

  return NextResponse.json({
    success: true,
    message: "付款凭证已提交，请等待管理员审核",
  })
}

// 管理员审核通过
export async function PUT(req: NextRequest) {
  const session = await auth()

  // 检查是否是管理员
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json(
      { error: "无权操作" },
      { status: 403 }
    )
  }

  const { userId, approve } = await req.json()

  if (approve) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: "ACTIVE",
        hasAiAccess: true,
      },
    })
  } else {
    await prisma.subscription.update({
      where: { userId },
      data: {
        planType: "FREE",
        status: "ACTIVE",
        hasAiAccess: false,
        monthlyTokens: 0,
        imagesAllowed: 0,
      },
    })
  }

  return NextResponse.json({ success: true })
}

// 获取待审核列表
export async function GET(req: NextRequest) {
  const session = await auth()

  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json(
      { error: "无权操作" },
      { status: 403 }
    )
  }

  const pending = await prisma.subscription.findMany({
    where: {
      planType: "PRO",
      status: "TRIALING",
      hasAiAccess: false,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return NextResponse.json({ pending })
}
