import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// 码支��创建订单
async function createPayJSOrder(userId: string, amount: number) {
  const mchId = process.env.PAYJS_MCH_ID
  const key = process.env.PAYJS_KEY

  if (!mchId || !key) {
    throw new Error("PayJS not configured")
  }

  const outTradeNo = `order_${Date.now()}_${userId}`
  const notifyUrl = `${process.env.NEXTAUTH_URL}/api/payment/webhook?type=payjs`

  // 构建签名参数
  const params = {
    mchid: mchId,
    out_trade_no: outTradeNo,
    total_fee: Math.round(amount * 100), // 转换为分
    body: "Slidev Pro 会员订阅",
    notify_url: notifyUrl,
  }

  // 生成签名
  const sorted = Object.keys(params).sort()
  const str = sorted.map(k => `${k}=${params[k as keyof typeof params]}`).join("&") + key
  const sign = crypto.createHash("md5").update(str).digest("hex")

  // 创建订单记录
  await prisma.paymentOrder.create({
    data: {
      userId,
      amount,
      method: "WECHAT",
      status: "PENDING",
      outTradeNo,
    },
  })

  // 调用 PayJS API
  const response = await fetch("https://payjs.cn/api/native", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, sign }),
  })

  const result = await response.json()

  if (result.return_code !== 1) {
    throw new Error(result.msg || "创建支付订单失败")
  }

  return {
    qrcode: result.qrcode,
    outTradeNo,
  }
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

    const { amount, method } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "无效的金额" },
        { status: 400 }
      )
    }

    const userId = session.user.id

    switch (method) {
      case "payjs":
        const result = await createPayJSOrder(userId, amount)
        return NextResponse.json(result)

      default:
        return NextResponse.json(
          { error: "不支持的支付方式" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error("Create payment order error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "创建支付订单失败"
      },
      { status: 500 }
    )
  }
}

// 获取支付套餐
export async function GET() {
  return NextResponse.json({
    plans: [
      {
        id: "monthly",
        name: "月付",
        price: 71,
        priceUsd: 9.9,
        currency: "CNY",
        features: {
          tokens: 10_000_000, // 10M tokens (Kimi @ ¥2/M = ¥20 成本)
          images: 1000, // 1000 张 (Zhipu @ 0.018元/张 = ¥18 成本)
        },
        // 总成本 ~¥38，售价 ¥71，利润 ~¥33 (47% 利润率)
      },
      {
        id: "quarterly",
        name: "季付",
        price: 195,
        priceUsd: 27,
        currency: "CNY",
        discount: "优惠 ¥18 (9% off)",
        discountPercent: 9,
        features: {
          tokens: 30_000_000, // 30M tokens (3 months)
          images: 3000,
        },
        // 总成本 ~¥114，售价 ¥195，利润 ~¥81 (42% 利润率)
      },
      {
        id: "yearly",
        name: "年付",
        price: 640,
        priceUsd: 89,
        currency: "CNY",
        discount: "优惠 ¥212 (25% off)",
        discountPercent: 25,
        features: {
          tokens: 120_000_000, // 120M tokens (12 months)
          images: 12000,
        },
        // 总成本 ~¥456，售价 ¥640，利润 ~¥184 (29% 利润率)
      },
    ],
  })
}
