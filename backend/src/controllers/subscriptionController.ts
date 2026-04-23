import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import { getBillingUserById, getSubscriptionSnapshotForUser } from "../services/billingService";
import { createSubscriptionCheckoutSession } from "../services/stripeService";

const checkoutSchema = z.object({
  planType: z.enum(["weekly", "monthly", "yearly"]),
});

const plans = [
  {
    id: "weekly",
    price: 3,
    currency: "USD",
    cadence: "week",
  },
  {
    id: "monthly",
    price: 10,
    currency: "USD",
    cadence: "month",
  },
  {
    id: "yearly",
    price: 120,
    currency: "USD",
    cadence: "year",
  },
];

export function getPlans(_req: AuthenticatedRequest, res: Response) {
  res.json({
    plans,
  });
}

export async function createCheckoutSession(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  try {
    const billingUser = await getBillingUserById(userId);
    const checkoutSession = await createSubscriptionCheckoutSession({
      userId,
      userEmail: billingUser?.email,
      planType: parsed.data.planType,
    });

    res.status(201).json({
      message: "Stripe checkout session created.",
      status: "pending",
      ...checkoutSession,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout could not be created.";
    const isConfigError = /^Missing STRIPE_/i.test(message);
    res.status(isConfigError ? 503 : 500).json({
      message,
      code: isConfigError ? "stripe_not_configured" : "stripe_checkout_failed",
    });
  }
}

export async function getMySubscription(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const subscription = await getSubscriptionSnapshotForUser(userId);
  res.json({ subscription });
}
