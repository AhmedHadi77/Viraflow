import { Request, Response } from "express";
import {
  activateReelBoostFromStripe,
  activateSubscriptionFromStripe,
  cancelSubscriptionFromStripe,
} from "../services/billingService";
import { constructStripeWebhookEvent } from "../services/stripeService";

export async function handleStripeWebhook(req: Request, res: Response) {
  let event: any;

  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? "");
    event = constructStripeWebhookEvent(rawBody, req.header("stripe-signature"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook request.";
    res.status(400).json({ message });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    res.status(500).json({ message: "Stripe webhook processing failed." });
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const metadata = session.metadata ?? {};
  const userId = readString(metadata.userId) ?? session.client_reference_id ?? undefined;

  if (!userId) {
    throw new Error("Stripe checkout session is missing the ViraFlow user id.");
  }

  if (metadata.kind === "subscription") {
    const planType = metadata.planType;
    if (!isPaidPlanType(planType) || !isSuccessfulSubscriptionCheckout(session)) {
      return;
    }

    await activateSubscriptionFromStripe({
      userId,
      planType,
      stripeCustomerId: readStripeId(session.customer),
      stripeSubscriptionId: readStripeId(session.subscription),
      stripePriceId: readString(metadata.priceId),
      checkoutSessionId: session.id,
    });
    return;
  }

  if (metadata.kind === "boost") {
    const reelId = readString(metadata.reelId);
    const planId = readString(metadata.planId);
    if (!reelId || !isBoostPlanId(planId) || !isSuccessfulPaymentCheckout(session)) {
      return;
    }

    await activateReelBoostFromStripe({
      userId,
      reelId,
      planId,
      paymentIntentId: readStripeId(session.payment_intent),
      checkoutSessionId: session.id,
    });
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  await cancelSubscriptionFromStripe({
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: readStripeId(subscription.customer),
  });
}

function readStripeId(value: unknown) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value && "id" in value && typeof value.id === "string") {
    return value.id;
  }

  return undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isPaidPlanType(value: string | undefined): value is "weekly" | "monthly" | "yearly" {
  return value === "weekly" || value === "monthly" || value === "yearly";
}

function isBoostPlanId(value: string | undefined): value is "starter" | "growth" | "viral" {
  return value === "starter" || value === "growth" || value === "viral";
}

function isSuccessfulSubscriptionCheckout(session: any) {
  return session.mode === "subscription" && (session.payment_status === "paid" || session.payment_status === "no_payment_required");
}

function isSuccessfulPaymentCheckout(session: any) {
  return session.mode === "payment" && session.payment_status === "paid";
}
