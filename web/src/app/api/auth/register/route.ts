import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"

export const runtime = "nodejs"

const MIN_PASSWORD_LENGTH = 8

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 })
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing?.passwordHash) {
      return NextResponse.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 })
    }

    if (existing && !existing.passwordHash) {
      return NextResponse.json({ error: "该邮箱已绑定第三方登录，请使用 GitHub 登录" }, { status: 409 })
    }

    const passwordHash = hashPassword(password)
    const displayName = name || email.split("@")[0]

    const user = await prisma.user.create({
      data: {
        email,
        name: displayName,
        passwordHash,
      },
    })

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 })
  }
}
