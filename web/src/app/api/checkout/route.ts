import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createCheckoutSession } from "@/lib/stripe"
import Stripe from "stripe"

// Inline Stripe client for customer creation
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover",
    typescript: true,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  // Get or create user's subscription
  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  // If user doesn't have a subscription record, create one
  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        userId,
        planType: "FREE",
        status: "TRIALING",
        hasAiAccess: false,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 day trial
        currentPeriodStart: new Date(),
      },
    })
  }

  // Get or create Stripe customer
  let customerId = subscription.stripeCustomerId

  if (!customerId) {
    const stripe = getStripeClient()
    const customer = await stripe.customers.create({
      email: session.user.email || undefined,
      metadata: {
        userId,
      },
    })
    customerId = customer.id

    await prisma.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customerId },
    })
  }

  // Create checkout session
  try {
    const checkoutSession = await createCheckoutSession({
      userId,
      userEmail: session.user.email || "",
      customerId: customerId || undefined,
      successUrl: `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000"}/pricing?success=true`,
      cancelUrl: `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000"}/pricing?canceled=true`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
