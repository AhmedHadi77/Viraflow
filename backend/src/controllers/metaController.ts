import { Request, Response } from "express";
import { env } from "../config/env";
import { isFirebaseAdminConfigured } from "../services/firebaseService";

export function health(_req: Request, res: Response) {
  res.json({
    status: "ok",
    service: "viraflow-api",
    timestamp: new Date().toISOString(),
    host: env.host,
    port: env.port,
    firebaseConfigured: isFirebaseAdminConfigured(),
    cloudinaryConfigured: Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret),
    stripeConfigured: Boolean(env.stripeSecretKey && env.stripeWebhookSecret && env.stripeSuccessUrl && env.stripeCancelUrl),
    stripeSubscriptionPricesConfigured: Boolean(env.stripePriceWeekly && env.stripePriceMonthly && env.stripePriceYearly),
    stripeBoostPricesConfigured: Boolean(
      env.stripePriceBoostStarter && env.stripePriceBoostGrowth && env.stripePriceBoostViral
    ),
    openAiConfigured: Boolean(env.openAiApiKey),
  });
}

export function getLanguages(_req: Request, res: Response) {
  res.json({
    languages: [
      { code: "en", label: "English" },
      { code: "ar", label: "Arabic" },
      { code: "fr", label: "French" },
      { code: "es", label: "Spanish" },
    ],
  });
}
