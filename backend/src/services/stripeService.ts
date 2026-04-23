import Stripe from "stripe";
import { env } from "../config/env";
import { PlanType, ReelBoostPlanId } from "../types/models";

let cachedStripeClient: ReturnType<typeof buildStripeClient> | null = null;

type PaidPlanType = Exclude<PlanType, "free">;

const subscriptionPriceIds: Record<PaidPlanType, string> = {
  weekly: env.stripePriceWeekly,
  monthly: env.stripePriceMonthly,
  yearly: env.stripePriceYearly,
};

const boostPriceIds: Record<ReelBoostPlanId, string> = {
  starter: env.stripePriceBoostStarter,
  growth: env.stripePriceBoostGrowth,
  viral: env.stripePriceBoostViral,
};

export function isStripeConfigured() {
  return Boolean(env.stripeSecretKey);
}

export async function createSubscriptionCheckoutSession(input: {
  userId: string;
  userEmail?: string;
  planType: PaidPlanType;
}) {
  const stripe = getStripeClient();
  const priceId = getRequiredSubscriptionPriceId(input.planType);
  const metadata = {
    kind: "subscription",
    userId: input.userId,
    planType: input.planType,
    priceId,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: getRequiredSuccessUrl(),
    cancel_url: getRequiredCancelUrl(),
    client_reference_id: input.userId,
    customer_email: input.userEmail,
    allow_promotion_codes: true,
    metadata,
    subscription_data: {
      metadata,
    },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
  });

  if (!session.url) {
    throw new Error("Stripe checkout URL was not returned.");
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    mode: session.mode,
  };
}

export async function createBoostCheckoutSession(input: {
  userId: string;
  userEmail?: string;
  reelId: string;
  reelCaption?: string;
  planId: ReelBoostPlanId;
}) {
  const stripe = getStripeClient();
  const priceId = getRequiredBoostPriceId(input.planId);
  const metadata = {
    kind: "boost",
    userId: input.userId,
    reelId: input.reelId,
    planId: input.planId,
    priceId,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: getRequiredSuccessUrl(),
    cancel_url: getRequiredCancelUrl(),
    client_reference_id: input.userId,
    customer_email: input.userEmail,
    allow_promotion_codes: true,
    metadata,
    payment_intent_data: {
      metadata,
    },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    custom_text: input.reelCaption
      ? {
          submit: {
            message: `Boosting reel: ${input.reelCaption.slice(0, 120)}`,
          },
        }
      : undefined,
  });

  if (!session.url) {
    throw new Error("Stripe checkout URL was not returned.");
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    mode: session.mode,
  };
}

export function constructStripeWebhookEvent(payload: Buffer, signature: string | string[] | undefined) {
  if (!env.stripeWebhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
  }

  const signatureHeader = Array.isArray(signature) ? signature[0] : signature;
  if (!signatureHeader) {
    throw new Error("Missing Stripe signature header.");
  }

  return getStripeClient().webhooks.constructEvent(payload, signatureHeader, env.stripeWebhookSecret);
}

function getStripeClient() {
  if (!env.stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  if (!cachedStripeClient) {
    cachedStripeClient = buildStripeClient();
  }

  return cachedStripeClient;
}

function buildStripeClient() {
  return new Stripe(env.stripeSecretKey);
}

function getRequiredSubscriptionPriceId(planType: PaidPlanType) {
  const priceId = subscriptionPriceIds[planType];
  if (!priceId) {
    throw new Error(`Missing STRIPE_PRICE_${planType.toUpperCase()}.`);
  }

  return priceId;
}

function getRequiredBoostPriceId(planId: ReelBoostPlanId) {
  const map: Record<ReelBoostPlanId, string> = {
    starter: boostPriceIds.starter,
    growth: boostPriceIds.growth,
    viral: boostPriceIds.viral,
  };
  const priceId = map[planId];
  if (!priceId) {
    throw new Error(`Missing STRIPE_PRICE_BOOST_${planId.toUpperCase()}.`);
  }

  return priceId;
}

function getRequiredSuccessUrl() {
  if (!env.stripeSuccessUrl) {
    throw new Error("Missing STRIPE_SUCCESS_URL.");
  }

  return env.stripeSuccessUrl;
}

function getRequiredCancelUrl() {
  if (!env.stripeCancelUrl) {
    throw new Error("Missing STRIPE_CANCEL_URL.");
  }

  return env.stripeCancelUrl;
}
