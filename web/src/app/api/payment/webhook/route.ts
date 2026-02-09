import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import crypto from "crypto"

// 验证签名（用于码支付等）
function verifySign(data: any, key: string): boolean {
  const sign = data.sign
  delete data.sign
  const sorted = Object.keys(data).sort()
  const str = sorted.map(k => `${k}=${data[k]}`).join("&") + key
  const hash = crypto.createHash("md5").update(str).digest("hex")
  return hash === sign
}

// 码支付回调处理
async function handlePayJSCallback(req: NextRequest) {
  const body = await req.json()
  const key = process.env.PAYJS_KEY

  if (!key || !verifySign(body, key)) {
    return NextResponse.json({ code: 1, msg: "签名验证失败" }, { status: 400 })
  }

  // PayJS 成功状态
  if (body.return_code !== 1) {
    return NextResponse.json({ code: 1, msg: "支付未成功" })
  }

  // 从 out_trade_no 提取 userId: order_timestamp_userid
  const outTradeNo = body.out_trade_no as string
  const userId = outTradeNo.split("_").pop()

  if (!userId) {
    return NextResponse.json({ code: 1, msg: "无效的订单号" }, { status: 400 })
  }

  // 检查订单是否已处理
  const existingOrder = await prisma.paymentOrder.findFirst({
    where: { transaction: body.transaction_id }
  })

  if (existingOrder) {
    return NextResponse.json({ code: 0, msg: "订单已处理" })
  }

  // 创建订单记录
  await prisma.paymentOrder.create({
    data: {
      userId,
      amount: Number(body.total_fee) / 100, // 转换为元
      method: "WECHAT",
      status: "PAID",
      transaction: body.transaction_id,
    },
  })

  // 激活用户 Pro 会员
  // 根据套餐金额计算配额和时长
  const paidAmount = Number(body.total_fee) / 100

  let tokensPerMonth = 10_000_000 // 10M tokens/月
  let imagesPerMonth = 1000       // 1000 张/月
  let months = 1

  // 根据金额判断套餐类型 (¥71 月付, ¥195 季付, ¥640 年付)
  if (paidAmount >= 630) {
    // 年付 ¥640
    months = 12
  } else if (paidAmount >= 190) {
    // 季付 ¥195
    months = 3
  } else {
    // 月付 ¥71
    months = 1
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  const periodEnd = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)

  if (subscription) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        planType: "PRO",
        status: "ACTIVE",
        hasAiAccess: true,
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
        status: "ACTIVE",
        hasAiAccess: true,
        monthlyTokens: tokensPerMonth,
        imagesAllowed: imagesPerMonth,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    })
  }

  return NextResponse.json({ code: 0, msg: "OK" })
}

// 手动激活（管理员后台）
async function handleManualActivation(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 })
  }

  const { userId, months = 1 } = await req.json()

  // 激活用户
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  const periodEnd = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
  const monthlyTokens = 10_000_000 // 10M tokens/month
  const imagesAllowed = 1000       // 1000 images/month

  if (subscription) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        planType: "PRO",
        status: "ACTIVE",
        hasAiAccess: true,
        monthlyTokens,
        imagesAllowed,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    })
  } else {
    await prisma.subscription.create({
      data: {
        userId,
        planType: "PRO",
        status: "ACTIVE",
        hasAiAccess: true,
        monthlyTokens,
        imagesAllowed,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    })
  }

  return NextResponse.json({ success: true })
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")

  switch (type) {
    case "payjs":
      return handlePayJSCallback(req)
    case "manual":
      return handleManualActivation(req)
    default:
      return NextResponse.json({ error: "Unknown webhook type" }, { status: 400 })
  }
}

// 支付回调 GET（用于 PayJS 同步跳转）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")

  if (type === "payjs") {
    // PayJS 同步跳转，重定向到成功页面
    const success = searchParams.get("return_code") === "1"
    const redirectUrl = success
      ? "/?payment=success"
      : "/?payment=failed"
    return NextResponse.redirect(new URL(redirectUrl, req.url))
  }

  return NextResponse.json({ error: "Unknown webhook type" }, { status: 400 })
}
