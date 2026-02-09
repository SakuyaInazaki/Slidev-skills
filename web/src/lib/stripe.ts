import Stripe from "stripe"

// Stripe Product and Price IDs - you'll get these from Stripe Dashboard
export const PRICING = {
  PRO_MONTHLY: {
    productId: process.env.STRIPE_PRO_PRODUCT_ID || "",
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
    amount: 999, // $9.99
    currency: "usd",
  },
} as const

// Lazy initialize Stripe client
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover",
    typescript: true,
  })
}

// Create a checkout session for subscription
export async function createCheckoutSession({
  userId,
  userEmail,
  customerId,
  successUrl,
  cancelUrl,
}: {
  userId: string
  userEmail: string
  customerId?: string
  successUrl: string
  cancelUrl: string
}) {
  const stripe = getStripeClient()
  const priceId = PRICING.PRO_MONTHLY.priceId

  if (!priceId) {
    throw new Error("Stripe price ID not configured")
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer: customerId || userEmail,
    customer_email: customerId ? undefined : userEmail,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  })

  return session
}

// Get customer's subscription details
export async function getSubscription(customerId: string) {
  const stripe = getStripeClient()
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  })

  return subscriptions.data[0] || null
}

// Cancel subscription at period end
export async function cancelSubscription(subscriptionId: string) {
  const stripe = getStripeClient()
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}
