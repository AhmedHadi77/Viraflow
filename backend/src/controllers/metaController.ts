import { Request, Response } from "express";
import { env } from "../config/env";
import { getExchangeRates } from "../services/exchangeRateService";
import { getFirebaseAdminStatus, isFirebaseAdminConfigured } from "../services/firebaseService";
import { getIceServers, isTurnConfigured } from "../services/iceServerService";
import type { AuthenticatedRequest } from "../middleware/auth";

export function health(_req: Request, res: Response) {
  res.json({
    status: "ok",
    service: "viraflow-api",
    timestamp: new Date().toISOString(),
    host: env.host,
    port: env.port,
    firebaseConfigured: isFirebaseAdminConfigured(),
    firebaseAdmin: getFirebaseAdminStatus(),
    callRelayConfigured: isTurnConfigured(),
    cloudinaryConfigured: Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret),
    stripeConfigured: Boolean(env.stripeSecretKey && env.stripeWebhookSecret && env.stripeSuccessUrl && env.stripeCancelUrl),
    stripeSubscriptionPricesConfigured: Boolean(env.stripePriceWeekly && env.stripePriceMonthly && env.stripePriceYearly),
    stripeBoostPricesConfigured: Boolean(
      env.stripePriceBoostStarter && env.stripePriceBoostGrowth && env.stripePriceBoostViral
    ),
    openAiConfigured: Boolean(env.openAiApiKey),
  });
}

export async function exchangeRates(_req: Request, res: Response) {
  try {
    const table = await getExchangeRates();
    res.set("Cache-Control", "public, max-age=3600");
    res.json(table);
  } catch {
    res.status(503).json({ message: "Exchange rates are unavailable right now." });
  }
}

export function getLanguages(_req: Request, res: Response) {
  res.json({
    languages: [
      { code: "en", label: "English" },
      { code: "ar", label: "Arabic" },
      { code: "fr", label: "French" },
      { code: "es", label: "Spanish" },
      { code: "pt", label: "Portuguese" },
      { code: "de", label: "German" },
      { code: "tr", label: "Turkish" },
      { code: "ru", label: "Russian" },
      { code: "hi", label: "Hindi" },
      { code: "ur", label: "Urdu" },
      { code: "ms", label: "Malay" },
      { code: "id", label: "Indonesian" },
      { code: "zh", label: "Chinese (Simplified)" },
      { code: "ja", label: "Japanese" },
    ],
  });
}

/** Connection servers for voice and video calls (signed-in users only; relay credentials are short-lived). */
export async function iceServers(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }
  res.set("Cache-Control", "private, max-age=3600");
  res.json({ iceServers: await getIceServers() });
}
