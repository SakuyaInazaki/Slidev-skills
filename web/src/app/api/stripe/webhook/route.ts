import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"

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
  const body = await req.text()
  const headersList = await headers()
  const sig = headersList.get("stripe-signature")!

  let event: Stripe.Event
  const stripe = getStripeClient()

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const checkoutSession = event.data.object as Stripe.Checkout.Session
      const userId = checkoutSession.metadata?.userId
      const subscriptionId = checkoutSession.subscription as string

      if (userId && subscriptionId) {
        // Fetch the subscription to get period details
        const retrieved = await stripe.subscriptions.retrieve(subscriptionId)
        const stripeSub = retrieved as any

        await prisma.subscription.update({
          where: { userId },
          data: {
            planType: "PRO",
            status: "ACTIVE",
            hasAiAccess: true,
            monthlyTokens: 100000, // You can adjust this
            imagesAllowed: 100,
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            stripeSubscriptionId: subscriptionId,
          },
        })
      }
      break
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const stripeSubscription = event.data.object as any
      const customerId = stripeSubscription.customer as string

      // Find user by Stripe customer ID
      const userSubscription = await prisma.subscription.findFirst({
        where: { stripeCustomerId: customerId },
      })

      if (userSubscription) {
        const isActive = stripeSubscription.status === "active"

        await prisma.subscription.update({
          where: { userId: userSubscription.userId },
          data: {
            status: isActive ? "ACTIVE" : "CANCELED",
            hasAiAccess: isActive,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            currentPeriodEnd: stripeSubscription.current_period_end
              ? new Date(stripeSubscription.current_period_end * 1000)
              : null,
          },
        })
      }
      break
    }

    case "invoice.payment_succeeded": {
      // Payment succeeded, subscription renewed
      break
    }

    case "invoice.payment_failed": {
      // Payment failed, subscription may be canceled
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
}
